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
import Tooltip from '@material-ui/core/Tooltip';

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
import animateCss from './animate.css';
import Signaling from './Signaling';
import transitions from '@material-ui/core/styles/transitions';

// import MultiStreamRecorder from './MultiStreamRecorder';

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
  },

  clicktostart: {
    minWidth: "240px",
    position: "absolute",
    zIndex: "100",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    textTransform: "initial",
    width: "50%",
    fontSize: "20px",
    padding: "20px 24px"
  },

  overlay: {
    position: "fixed",
    margin: 0,
    padding: 0,
    top: 0,
    left: 0,
    zIndex: "99",
    width: "100%",
    height: "100%",
    background: "#555",
    // display: 'none'
  },

  noJoin: {
    height: "100%",
    background: "url(https://s-t-r-i-v-e.com/wp-content/uploads/2020/04/download.png)",
    backgroundRepeat: "no-repeat",
    backgroundSize: "50%",
    backgroundPosition: "center",
    backgroundColor: "#555",
    zIndex: "-1",
  }
};

let mediaRecorder;
let recordedBlobs;
let sourceBuffer;
let num = 0;
let videoElm;
let flipBtn;
// default user media options
let defaultsOpts = { audio: false, video: true }

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

class App extends Component {

  constructor(props) {
    super(props);

    this.selfView = null;
    this.remoteView = null;
    this.signaling = new Signaling('wss://' + "videochat.s-t-r-i-v-e.com" + ':4443', "Video Call");;

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
      inviter: false,
      displayBtns: true,
      our_room_peers: [],
      startdisable: true,
    };
  }

  componentDidMount = () => {
    // var url = 'wss://' + window.location.hostname + ':4443';
    // var url = 'wss://' + "127.0.0.1" + ':4443';
    var url = 'wss://' + "videochat.s-t-r-i-v-e.com" + ':4443';
    // this.signaling = new Signaling(url, "Video Call");
    // let camera_front = this.state.camera_front;
    // this.signaling.onSwitchCamera(this.state.current_peer, 'video', camera_front, this.state.inviter);

    this.signaling.on('peers', (peers, self) => {
      let self_peer = null;
      console.log(peers)
      let ourRoom = peers.filter((item) => {
        if (item.id === self) {
          self_peer = item;
        }
        console.log('ursl', item.parent_url, this.getParentURL())
        return (item.id !== self && item.parent_url === this.getParentURL())
      })
      const that = this;
      this.wait(1000).then(() => {
        ourRoom.unshift(self_peer)
        that.setState({ peers, our_room_peers: ourRoom, self_id: self, startdisable: false });
        console.log(ourRoom)
      })

    });

    this.signaling.on('new_call', (from, sessios) => {
      console.log(from, sessios)

      // if (this.state.self_id != from && !this.state.open && !confirm('accept or decline, please') ) {
      //   this.signaling.bye();
      //   return;
      // }
      if (this.state.self_id != from) {
        this.setState({ inviter: false });
        console.log('i am called inviter')
      }
      this.setState({ open: true, current_peer: from });
    });

    this.signaling.on('localstream', (stream) => {
      console.log('localstream emitted', stream)
      this.setState({ localStream: stream });
    });

    this.signaling.on('addstream', (stream, track) => {
      console.log('addstreamapp', stream, track)
      // stream.addTrack(track)
      this.setState({ remoteStream: stream });
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
      this.applyStream(stream);
    });

  }

  getParentURL = () => {
    var url = window.location.href;
    var aa = url.split("url=");
    return (aa[1])
  }

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  handleInvitePeer = (peer_id, type) => {
    this.signaling.invite(peer_id, type, this.state.camera_front);
    this.setState({ current_peer: peer_id, inviter: true });
  }

  handleBye = () => {
    this.handleClose();
    this.signaling.bye();
  }

  handleStart = () => {
    let ourRoom = this.state.our_room_peers;
    console.log(ourRoom[ourRoom.length - 1])
    if (ourRoom.length > 1) {
      let target_id = ourRoom[ourRoom.length - 1].id
      console.log(target_id)
      this.handleInvitePeer(target_id, 'video')
    } else if (ourRoom.length > 2) {

    } else {
      // this.signaling.getLocalStream('video', true).then((stream) => {
      //   this.setState({ localStream: stream });
      //   this.handleClickOpen();
      // })
      alert('no joined user')
    }
  }


  //onCameraFlip start
  onSwitchCamera = () => {
    let camera_front = !this.state.camera_front;

    this.signaling.onSwitchCamera(this.state.current_peer, 'video', camera_front, this.state.inviter);
    this.setState({ camera_front });
    console.log(this.state.self_id, this.state.current_peer)

  }
  applyStream = (stream) => {
    console.log('applystream', stream)
    videoElm = document.querySelector('#localview');
    videoElm.srcObject = stream;
    videoElm.play();
    this.setState({ localStream: stream })
  }
  //on cameraflip end

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
  onAudioClickHandler = (firsttime) => {
    let audio_muted = !this.state.audio_muted;
    if (firsttime == true) audio_muted = true;
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
    mediaRecorder = new MediaRecorder(this.state.remoteStream, options);

    this.setState({ recording: true });
    console.log('recording started')
    recordedBlobs = [];
    let options = { mimeType: 'video/mp4;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not Supported`);
      console.log(`${options.mimeType} is not Supported`);
      options = { mimeType: 'video/mp4;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not Supported`);
        console.log(`${options.mimeType} is not Supported`);
        options = { mimeType: 'video/mp4' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.error(`${options.mimeType} is not Supported`);
          console.log(`${options.mimeType} is not Supported`);
          options = { mimeType: '' };
        }
      }
    }

    var recorder = new MultiStreamRecorder([this.state.localStream, this.state.remoteStream], options);
    recorder.streams = [this.state.localStream, this.state.remoteStream];
    recorder.start();
    recorder.ondataavailable = handleDataAvailable;
    this.wait(3000).then(() => {
      recorder.stop(function onStopRecording(blob, ignoreGetSeekableBlob) {
        console.log(blob, ignoreGetSeekableBlob)
        if (fixVideoSeekingIssues && recorder && !ignoreGetSeekableBlob) {
          getSeekableBlob(recorder.blob, function (seekableBlob) {
            onStopRecording(seekableBlob, true);
          });
          return;
        }
      });
      this.downloadRecorded()
      console.log('stopped man')
    })
    // return;
    // try {
    //   mediaRecorder = new MediaRecorder(this.state.remoteStream, options);
    // } catch (e) {
    //   console.error('Exception while creating MediaRecorder:', e);
    //   console.log.log(`Exception while creating MediaRecorder: ${JSON.stringify(e)}`);
    //   return;
    // }

    // console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

    // mediaRecorder.onstop = (event) => {
    //   console.log('Recorder stopped: ', event);
    //   console.log('Recorded Blobs: ', recordedBlobs);
    // };
    // mediaRecorder.ondataavailable = handleDataAvailable;
    // mediaRecorder.start(10); // collect 10ms of data
    // console.log('MediaRecorder started', mediaRecorder);
  }

  stopRecord = () => {
    this.setState({ recording: false });
    console.log('recording Stopped');
    mediaRecorder.stop();
    this.setState({ recorded: true })
  }

  downloadRecorded = () => {
    this.setState({ recorded: false })
    const blob = new Blob(recordedBlobs, { type: 'video/mp4' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = this.getFileName();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    // mediaRecorder.stop();
  }

  getFileName = (fileExtension) => {
    let d = new Date();
    let year = d.getFullYear();
    let month = d.getMonth();
    let date = d.getDate();
    let hour = d.getHours();
    let min = d.getMinutes();
    let sec = d.getSeconds();
    let fileName = 'strive-' + year + month + date + hour + min + sec + '.mp4';
    console.log(fileName)
    return fileName
  }
  // on record end

  toggleBtns = () => {
    let displayBtns = !this.state.displayBtns;
    // this.setState({ displayBtns });
    console.log('togglebtns')
  }

  wait = (delayInMS) => {
    return new Promise(resolve => setTimeout(resolve, delayInMS));
  }

  render() {

    const { classes } = this.props;
    const isDisable = (this.state.startdisable) ? "disabled" : "";
    return (
      <MuiThemeProvider theme={theme}>
        <div className={classes.root}>
          {/* <iframe src="https://ancient-fjord-18442.herokuapp.com/#fkdaef4343556655343546546fd" style={{ display: "none" }} allow="camera;microphone"></iframe> */}
          {/* <div style={styles.overlay}>
            <Button variant="contained" color="primary" size="large"
              className={classes.button}
              onClick={this.handleStart}
              disabled={this.state.startdisable}
              style={styles.clicktostart} id="clicktos" >
              <VideoCamIcon style={{ fontSize: "37px", marginRight: "5px" }} /> Click to Start Video Chat
            </Button>
          </div> */}
          <AppBar position="static">
            <Toolbar>
              <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Video Chat
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
                      <ListItemText primary={peer.name + ' ' + '  [' + peer.user_agent + ']' + (peer.id === this.state.self_id ? ' (You)' : (i + 1))} secondary={(peer.id === this.state.self_id ? 'self' : 'peer') + '-id: ' + peer.id} />
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
            <div style={styles.noJoin}>
              {
                this.state.remoteStream != null ? <RemoteVideoView toggleBtns={this.toggleBtns} stream={this.state.remoteStream} id={'remoteview'} /> : null
              }
              {
                this.state.localStream != null ? <LocalVideoView stream={this.state.localStream} ToggleAudio={this.onAudioClickHandler} muted={this.state.video_muted} id={'localview'} /> : null
              }
            </div>
            <div className={css.btnTools} style={{ display: (this.state.displayBtns) ? 'flex' : 'none' }}>
              <Tooltip title="Toggle Camera" placement="top">
                <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onSwitchCamera}>
                  {
                    this.state.camera_front ? <CameraFrontIcon /> : <CameraRearIcon />
                  }
                </Button>

              </Tooltip>
              <Tooltip title="Video on/off" placement="top">
                <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onVideoOnClickHandler}>
                  {
                    this.state.video_muted ? <VideoOffIcon /> : <VideoOnIcon />
                  }
                </Button>
              </Tooltip>
              <Tooltip title="Hang up" placement="top">
                <Button variant="fab" color="secondary" aria-label="add" style={styles.btnTool} onClick={this.handleBye}>
                  <PhoneIcon />
                </Button>
              </Tooltip>
              <Tooltip title="Mic on/off" placement="top">
                <Button variant="fab" mini color="primary" aria-label="add" style={styles.btnTool} onClick={this.onAudioClickHandler}>
                  {
                    this.state.audio_muted ? <MicOffIcon /> : <MicIcon />
                  }
                </Button>
              </Tooltip>
              <Tooltip title={this.state.recorded ? "Download" : (this.state.recording ? "Stop Recording" : "Record")
              } placement="top">
                <Button variant="fab" mini color="primary" aria-label="add" style={this.state.recording ? styles.recording : styles.lastBtn} onClick={this.onRecord}>
                  {
                    this.state.recorded ? <FileDownloadIcon />
                      :
                      (this.state.recording ? <RadioButtonCheckedIcon /> : <RadioButtonUncheckedIcon />)
                  }
                </Button>
              </Tooltip>
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
