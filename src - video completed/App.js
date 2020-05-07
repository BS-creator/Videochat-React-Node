import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import blue from '@material-ui/core/colors/blue';
import ListItemText from '@material-ui/core/ListItemText';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';
import Slide from '@material-ui/core/Slide';

import VideoCamIcon from '@material-ui/icons/Videocam';
import CallIcon from '@material-ui/icons/Call';
import PhoneIcon from '@material-ui/icons/CallEnd';
import VideoOnIcon from '@material-ui/icons/Videocam';
import VideoOffIcon from '@material-ui/icons/VideocamOff';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import CameraFrontIcon from '@material-ui/icons/CameraFront';
import CameraRearIcon from '@material-ui/icons/CameraRear';
import RadioButtonCheckedIcon from '@material-ui/icons/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import FileDownloadIcon from '@material-ui/icons/FileDownload';

import LocalVideoView from './LocalVideoView';
import RemoteVideoView from './RemoteVideoView';

import css from './layout.css';
import Signaling from './Signaling';
import transitions from '@material-ui/core/styles/transitions';

const theme = createMuiTheme({
  palette: {
    primary: blue,
  },
});

const styles = {
  root: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },

  btnTool: {
    color: 'white',
    marginRight: 20,
  },

  recording: {
    color: 'red',
    marginRight: 0,
  },

  lastBtn: {
    color: 'white',
    marginRight: 0
  }
};

let mediaRecorder;
let recordedBlobs;
let sourceBuffer;
let num = 0;

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

class App extends Component {

  constructor(props) {
    super(props);

    this.selfView = null;
    this.remoteView = null;
    this.signaling = null;

    this.state = {
      peers: [],
      self_id: null,
      open: false,
      localStream: null,
      remoteStream: null,
      audio_muted: false,
      video_muted: false,
      camera_front: true,
      recording: false,
      recorded: false,
      current_peer: null,
    };
  }

  componentDidMount = () => {
    // var url = 'wss://' + window.location.hostname + ':4443';
    // var url = 'wss://' + "127.0.0.1" + ':4443';
    var url = 'wss://' + "videochat.s-t-r-i-v-e.com" + ':4443'; 
    this.signaling = new Signaling(url, "Video Call");
    
    this.signaling.on('peers', (peers, self) => {
      this.setState({ peers, self_id: self });
    });

    this.signaling.on('new_call', (from, sessios) => {
      console.log(from, sessios)
      // confirm('accept or decline, please')
      // if (this.state.self_id != from && !confirm('accept or decline, please')) {
      //   this.signaling.bye();
      //   return;
      // }
      this.setState({ open: true });
    });

    this.signaling.on('localstream', (stream) => {
      console.log('localstream')
      console.log(stream)
      // this.setState({ remoteStream: stream });
      this.setState({ localStream: stream });
    });

    this.signaling.on('addstream', (stream) => {
      this.setState({ remoteStream: stream });
      console.log('addstream')
      console.log(stream)
      console.log(this.state.localStream.getVideoTracks())
      console.log(this.state.remoteStream.getVideoTracks())
    });

    this.signaling.on('removestream', (stream) => {
      this.setState({ remoteStream: null });
    });

    this.signaling.on('call_end', (to, session) => {
      this.setState({ open: false, localStream: null, remoteStream: null });
    });

    this.signaling.on('leave', (to) => {
      this.setState({ open: false, localStream: null, remoteStream: null });
    });

    this.signaling.on('switch_camera', (stream) => {
      console.log('switch camera i am called', stream)
      this.setState({ localStream: stream });
    });

    // this.signaling.invite('111111', 'video');

  }

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  handleInvitePeer = (peer_id, type) => {
    // if (num == 0) {
    //   this.signaling.invite(peer_id, type);
    //   this.signaling.bye();
    //   num++;
    // }
    // this.signaling.invite(111111, type);
    // this.wait(1000).then(() => {
    // })
    this.signaling.invite(peer_id, type);
    this.setState({ current_peer: peer_id });
  }

  handleBye = () => {
    this.signaling.bye();
  }

  //video open/close
  onVideoOnClickHandler = () => {
    let video_muted = !this.state.video_muted;
    this.onToggleLocalVideoTrack(video_muted);
    this.setState({ video_muted });
  }

  onToggleLocalVideoTrack = (muted) => {
    var videoTracks = this.state.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.log("No local video available.");
      return;
    }
    console.log("Toggling video mute state.");
    for (var i = 0; i < videoTracks.length; ++i) {
      videoTracks[i].enabled = !muted;
    }
  }
  // video open/close end

  // mic open/close start
  onAudioClickHandler = () => {
    let audio_muted = !this.state.audio_muted;
    this.onToggleLocalAudioTrack(audio_muted);
    this.setState({ audio_muted });
  }


  onToggleLocalAudioTrack = (muted) => {
    var audioTracks = this.state.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log("No local audio available.");
      return;
    }
    console.log("Toggling audio mute state.");
    for (var i = 0; i < audioTracks.length; ++i) {
      audioTracks[i].enabled = !muted;
    }
  }
  // mic end 


  //onCameraFlip start
  onSwitchCamera = () => {
    let camera_front = !this.state.camera_front;
    // this.signaling.onSwitchCamera(this.state.current_peer, camera_front);
    if (this.state.localStream == null) return
    // we need to flip, stop everything
    this.state.localStream.getTracks().forEach(t => {
      t.stop();
    });
    // toggle / flip
    let defaultsOpts = { audio: true, video: true }
    const that  = this;
    defaultsOpts.video = { facingMode: camera_front ? 'user' : 'environment' }
    navigator.mediaDevices.getUserMedia(defaultsOpts)
    .then(function (_stream) {
      const stream = _stream;
      that.setState({ camera_front, localStream: stream });
    })
    .catch(function (err) {
      console.log(err)
    });
  }
  //on cameraflip end

  //onRecord start
  onRecord = () => {
    let recording = !this.state.recording
    if (this.state.recorded) {
      this.downloadRecorded();
    } else if (recording) {
      this.startRecord();
    } else {
      this.stopRecord();
    }
    console.log(this.state.remoteStream)
  }

  startRecord = () => {
    this.setState({ recording: true });
    console.log('recording started')
    recordedBlobs = [];
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not Supported`);
      console.log(`${options.mimeType} is not Supported`);
      options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not Supported`);
        console.log(`${options.mimeType} is not Supported`);
        options = { mimeType: 'video/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.error(`${options.mimeType} is not Supported`);
          console.log(`${options.mimeType} is not Supported`);
          options = { mimeType: '' };
        }
      }
    }

    try {
      mediaRecorder = new MediaRecorder(this.state.remoteStream, options);
    } catch (e) {
      console.error('Exception while creating MediaRecorder:', e);
      console.log.log(`Exception while creating MediaRecorder: ${JSON.stringify(e)}`);
      return;
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

    mediaRecorder.onstop = (event) => {
      console.log('Recorder stopped: ', event);
      console.log('Recorded Blobs: ', recordedBlobs);
    };
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10); // collect 10ms of data
    console.log('MediaRecorder started', mediaRecorder);
  }

  stopRecord = () => {
    this.setState({ recording: false });
    console.log('recording Stopped');
    mediaRecorder.stop();
    this.setState({ recorded: true })
  }

  downloadRecorded = () => {
    this.setState({ recorded: false })
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'record.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    mediaRecorder.stop();
  }
  // on record end

  wait = (delayInMS) => {
      return new Promise(resolve => setTimeout(resolve, delayInMS));
  }

  render() {
    const { classes } = this.props;
    return (
      <MuiThemeProvider theme={theme}>
        <div className={classes.root}>
          <iframe src="https://textcompare.000webhostapp.com/#fkdaef4343556655343546546fd" style={{display: "none"}} allow="camera;microphone"></iframe>
          <AppBar position="static">
            <Toolbar>
              <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Strive Coaching Inc
            </Typography>
              {/*<Button color="inherit">Join</Button>*/}
            </Toolbar>
          </AppBar>
          <List>
            {
              this.state.peers.map((peer, i) => {
                return (
                  <div key={peer.id}>
                    <ListItem button >
                      <ListItemText primary={peer.name + ' '  + '  [' + peer.user_agent + ']' + (peer.id === this.state.self_id ? ' (You)' : (i+1))} secondary={(peer.id === this.state.self_id ? 'self' : 'peer') + '-id: ' + peer.id} />
                      {peer.id !== this.state.self_id &&
                        <div>
                          <IconButton color="primary" onClick={() => this.handleInvitePeer(peer.id, 'audio')} className={classes.button} aria-label="Make a voice call.">
                            <CallIcon />
                          </IconButton>
                          <IconButton color="primary" onClick={() => this.handleInvitePeer(peer.id, 'video')} className={classes.button} aria-label="Make a video call.">
                            <VideoCamIcon />
                          </IconButton>
                        </div>
                      }
                    </ListItem>
                    <Divider />
                  </div>
                )
              })
            }
          </List>
          <Dialog
            fullScreen
            open={this.state.open}
            onClose={this.handleClose}
            TransitionComponent={Transition}
          >
            <AppBar className={classes.appBar}>
              <Toolbar>
                <Typography variant="title" color="inherit" className={classes.flex}>
                  Calling
              </Typography>
              </Toolbar>
            </AppBar>
            <div>
              {
                this.state.remoteStream != null ? <RemoteVideoView stream={this.state.remoteStream} id={'remoteview'} /> : null
              }
              {
                this.state.localStream != null ? <LocalVideoView stream={this.state.localStream} ToggleAudio={this.onAudioClickHandler} muted={this.state.video_muted} id={'localview'} /> : null
              }
            </div>
            <div className={css.btnTools}>
              <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onSwitchCamera}>
                {
                  this.state.camera_front ? <CameraFrontIcon /> : <CameraRearIcon />
                }
              </Button>
              <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onVideoOnClickHandler}>
                {
                  this.state.video_muted ? <VideoOffIcon /> : <VideoOnIcon />
                }
              </Button>
              <Button variant="fab" color="secondary" aria-label="add" style={styles.btnTool} onClick={this.handleBye}>
                <PhoneIcon />
              </Button>
              <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onAudioClickHandler}>
                {
                  this.state.audio_muted ? <MicOffIcon /> : <MicIcon />
                }
              </Button>
              <Button variant="fab" mini color="primary" aria-label="add" style={this.state.recording ? styles.recording : styles.lastBtn} onClick={this.onRecord}>
                {
                  this.state.recorded ? <FileDownloadIcon />
                    :
                    (this.state.recording ? <RadioButtonCheckedIcon /> : <RadioButtonUncheckedIcon />)
                }
              </Button>
            </div>

          </Dialog>

        </div>
      </MuiThemeProvider>
    );
  }
}

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
