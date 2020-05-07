import * as events from 'events';
import browser from 'bowser';

const WS_PORT = 4443; //make sure this matches the port for the webscokets server

let localUuid;
let localDisplayName;
let localStream;
let serverConnection;
let peerConnections = {}; // key is uuid, values are peer connection object and user defined display name string
let remoteStreams = [];

let xirsysIceServers = {
  "iceServers": [
    { urls: ["stun:u3.xirsys.com"] },
    {
      username: "QzVfJ9-Xo5skB9L3qhmXrJGWNIbmXZkrH70eQg9Qfxls8tSyBA4n0vaEtgYygLduAAAAAF6SGUpTdHJpdmVIb3A=",
      credential: "fb6d88f4-7c29-11ea-a3d4-8a42fc970248",
      urls: [
        "turn:u3.xirsys.com:80?transport=udp",
        "turn:u3.xirsys.com:3478?transport=udp",
        "turn:u3.xirsys.com:80?transport=tcp",
        "turn:u3.xirsys.com:3478?transport=tcp",
        "turns:u3.xirsys.com:443?transport=tcp",
        "turns:u3.xirsys.com:5349?transport=tcp"
      ]
    }]
}
export default class SignalingMulti extends events.EventEmitter {

  constructor(url, name) {
    super();
    this.self_id = 0;
    this.url = url;
    this.name = name;
    this.local_stream;

    RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
    RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;

    localUuid = this.createUUID();
    localDisplayName = "Hello";

    // set up local video stream
    this.getLocalStream(true)
      .then((stream) => {
        this.local_stream = stream;
        localStream = stream;
        this.emit('localstream', stream);
        this.emit('new_call', this.self_id, this.session_id);
      })
      .catch(this.errorHandler)
      .then(() => {
        serverConnection = new WebSocket(this.url);
        serverConnection.onmessage = this.gotMessageFromServer;
        serverConnection.onopen = event => {
          serverConnection.send(JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': 'all' }));
        }
      })
      .catch(this.errorHandler)
  }

  gotMessageFromServer = (message) => {
    let signal = JSON.parse(message.data);
    let peerUuid = signal.uuid;
    const that = this;
    // Ignore messages that are not for us or from ourselves
    if (peerUuid == localUuid || (signal.dest != localUuid && signal.dest != 'all')) return;

    if (signal.displayName && signal.dest == 'all') {
      // set up peer connection object for a newcomer peer
      this.setUpPeer(peerUuid, signal.displayName);
      serverConnection.send(JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': peerUuid }));
    } else if (signal.displayName && signal.dest == localUuid) {
      // initiate call if we are the newcomer peer
      this.setUpPeer(peerUuid, signal.displayName, true);

    } else if (signal.sdp) {
      peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
        // Only create answers in response to offers
        if (signal.sdp.type == 'offer') {
          peerConnections[peerUuid].pc.createAnswer().then(description => that.createdDescription(description, peerUuid)).catch(that.errorHandler);
        }
      }).catch(this.errorHandler);

    } else if (signal.ice) {
      peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(that.errorHandler);
    }
  }

  setUpPeer = (peerUuid, displayName, initCall = false) => {
    peerConnections[peerUuid] = { 'displayName': displayName, 'pc': this.createPeerConnection() };
    // peerConnections[peerUuid].pc.onicecandidate = event => this.gotIceCandidate(event, peerUuid);
    // peerConnections[peerUuid].pc.ontrack = event => this.gotRemoteStream(event, peerUuid);
    // peerConnections[peerUuid].pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(event, peerUuid);
    // peerConnections[peerUuid].pc.addStream(localStream);

    const that = this;
    if (initCall) {
      peerConnections[peerUuid].pc.createOffer().then(description => that.createdDescription(description, peerUuid)).catch(this.errorHandler);
    }
  }

  createPeerConnection = (peerUuid) => {
    var pc = new RTCPeerConnection(xirsysIceServers);
    const that = this;
    pc.onicecandidate = (event) => {
      that.gotIceCandidate(event, peerUuid);
    };
    pc.onnegotiationneeded = () => {
      console.log('onnegotiationneeded');
    }
    pc.oniceconnectionstatechange = (event) => {
      console.log('oniceconnectionstatechange', event);
      that.checkPeerDisconnect(event, peerUuid);
    };
    pc.onsignalingstatechange = (event) => {
      console.log('onsignalingstatechange', event);
    };
    pc.ontrack = (event) => {
      console.log('ontrack', event);
      that.gotRemoteStream(event, peerUuid);
    }
    pc.onremovetrack = (event) => {
      console.log('onremovetrack ', event);
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    return pc;
  }

  gotIceCandidate = (event, peerUuid) => {
    if (event.candidate != null) {
      serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': localUuid, 'dest': peerUuid }));
    }
  }

  createdDescription = (description, peerUuid) => {
    console.log(`got description, peer ${peerUuid}`);
    peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
      serverConnection.send(JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
    }).catch(this.errorHandler);
  }

  gotRemoteStream = (event, peerUuid) => {
    console.log(`got remote stream, peer ${peerUuid}`);
    //assign stream to new HTML video element
    remoteStreams.push({ peerUuid, stream: event.streams[0] })
    this.emit('addstream', remoteStreams);
  }

  checkPeerDisconnect = (event, peerUuid) => {
    let state = peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer ${peerUuid} ${state}`);
    if (state === "failed" || state === "closed" || state === "disconnected") {
      delete peerConnections[peerUuid];

      let newVals = remoteStreams.filter((item) => {
        return item.peerUuid != peerUuid
      })
      remoteStreams = [...newVals]
      this.emit('addstream', remoteStreams);
    }
  }

  s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  createUUID = () => {
    return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + this.s4() + this.s4();
  }

  getLocalStream = (shouldFaceUser) => {
    return new Promise((pResolve, pReject) => {
      let cameraFacing = (shouldFaceUser) ? 0 : 1;
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          let videoDevices, videoDeviceIndex, constraints;
          //  Initialize the array wich will contain all video resources IDs.
          //  Most of devices have two video resources (Front & Rear Camera).
          videoDevices = [0, 0];
          //  Simple index to browse the videa resources array (videoDevices).
          videoDeviceIndex = 0;
          //  devices.forEach(), this function will detect all media resources (Audio, Video) of the device
          //  where we run the application.
          devices.forEach(function (device) {
            // If the kind of the media resource is video,
            if (device.kind == "videoinput") {
              //  then we save it on the array videoDevices.
              videoDevices[videoDeviceIndex++] = device.deviceId;
            }
          });

          // Here we specified which camera we start,
          //  videoDevices[0] : Front Camera
          //  videoDevices[1] : Back Camera
          if (videoDevices.length == 1 || videoDevices[1] == 0) {
            cameraFacing = 0;
          }
          constraints = {
            audio: {
              echoCancellation: { exact: true },
              // googEchoCancellation: true,
              noiseSuppression: { exact: true },
              // autoGainControl: true,
            },
            video: {
              width: { ideal: 1600, max: 1920 },
              height: { ideal: 1200, max: 1080 },
              frameRate: { ideal: 10, max: 15 },
              deviceId: { exact: videoDevices[cameraFacing] }
            }
          };
          return constraints;
        })
        .then(function (constraints) {
          navigator.mediaDevices.getUserMedia(constraints)
            .then(function (mediaStream) {
              pResolve(mediaStream);
            }).catch((err) => {
              console.log(err.name + ": " + err.message);
              pReject(err);
            }
            );
        })
    });
  }


  errorHandler = (error) => {
    console.log(error);
  }

}

