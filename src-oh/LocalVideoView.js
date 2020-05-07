import React, { Component } from 'react'
import PropTypes from "prop-types";
import css from './layout.css';
import VideoOffIcon from '@material-ui/icons/VideocamOff';

export default class LocalVideoView extends Component {

  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount = () => {
    let video = this.refs[this.props.id];
    video.srcObject = this.props.stream;
    // video.volume = 0;
    // video.muted = 0;
    video.onplaying = () => {
      this.setState({ show_sping: false });
    };

    video.onloadedmetadata = function (e) {
      video.play();
    };

    this.props.ToggleAudio(true);
  }

  render() {
    console.log('LocalVideoView', this.props.stream)
    const small = this.props.styleValue;

    const videoMuteImg = {
      display: 'block',
      position: 'absolute',
      top: '50%',
      width: '100%',
      transform: 'translateY(-50%)',
      color: '#fff',
    }

    return (
      <div key={this.props.id}
        style={small}>
        {

          this.props.muted ? <VideoOffIcon style={videoMuteImg} /> : null
        }
        <video ref={this.props.id} id={this.props.id} autoPlay playsInline muted={true}
          style={{ width: '100%', height: '100%', objectFit: 'cover', }} />
      </div>
    )
  }
}

LocalVideoView.propTypes = {
  stream: PropTypes.any.isRequired,
  id: PropTypes.string,
}
