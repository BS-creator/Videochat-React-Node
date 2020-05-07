import * as events from 'events';
import browser from 'bowser';

var RTCPeerConnection;
var RTCSessionDescription;
var configuration;
var twilioIceServers;

export default class Signaling extends events.EventEmitter {

    constructor(url, name) {
        super();
        this.socket = null;
        this.peer_connections = {};
        this.session_id = '0-0';
        this.self_id = 0;
        this.url = url;
        this.name = name;
        this.local_stream;
        this.keepalive_cnt = 0;
        this.pc1 = null;
        this.pc2 = null;

        RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
        RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
        navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;


        if (browser.safari) {
            var OrigPeerConnection = RTCPeerConnection;
            RTCPeerConnection = function (pcConfig, pcConstraints) {
                if (pcConfig && pcConfig.iceServers) {
                    var newIceServers = [];
                    for (var i = 0; i < pcConfig.iceServers.length; i++) {
                        var server = pcConfig.iceServers[i];
                        if (!server.hasOwnProperty('urls') &&
                            server.hasOwnProperty('url')) {
                            // utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                            server = JSON.parse(JSON.stringify(server));
                            server.urls = server.url;
                            delete server.url;
                            newIceServers.push(server);
                        } else {
                            newIceServers.push(pcConfig.iceServers[i]);
                        }
                    }
                    pcConfig.iceServers = newIceServers;
                }
                return new OrigPeerConnection(pcConfig, pcConstraints);
            };
        }
        console.log(RTCPeerConnection);
        twilioIceServers = [
            { url: 'stun:global.stun.twilio.com:3478?transport=udp' }
        ];

        configuration = { "iceServers": [
            { "url": "stun:stun.l.google.com:19302" },
            { 'urls': 'stun:stun.stunprotocol.org:3478' },
            {
                url: 'turn:numb.viagenie.ca?transport=udp',
                credential: 'Helloworld1',
                username: 'bestsolution2028@outlook.com'
            }
        ] };

        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => {
            console.log("wss connect success...");
            this.self_id = this.getRandomUserId();
            let message = {
                type: 'new',
                user_agent: browser.name + '/' + browser.version,
                name: this.name,
                id: this.self_id,
                parent_url: this.getParentURL(),
                iframe_url: window.location.href,
            }
            this.send(message);
            this.wsKeepaliveTimeoutId = setInterval(this.keepAlive, 12000);
        };

        this.socket.onmessage = (e) => {

            var parsedMessage = JSON.parse(e.data);

            console.info('on message: {\n    type = ' + parsedMessage.type + ', \n    data = ' + JSON.stringify(parsedMessage.data) + '\n}');

            switch (parsedMessage.type) {
                case 'invite':
                    this.onInvite(parsedMessage);
                    break;
                case 'ringing':
                    this.onRinging(parsedMessage);
                    break;
                case 'offer':
                    console.log('before createOffor')
                    this.onOffer(parsedMessage);
                    break;
                case 'answer':
                    this.onAnswer(parsedMessage);
                    break;
                case 'candidate':
                    this.onCandidate(parsedMessage);
                    break;
                case 'peers':
                    this.onPeers(parsedMessage);
                    break;
                case 'leave':
                    this.onLeave(parsedMessage);
                    break;
                case 'bye':
                    this.onBye(parsedMessage);
                    break;
                case 'keepalive':
                    console.log('keepalive response!');
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        };

        this.socket.onerror = (e) => {
            console.log('onerror::' + e.data);
        }

        this.socket.onclose = (e) => {
            console.log('onclose::' + e.data);
        }
    }

    getUrlParameter = (name, url) => {
        console.log(window.location.href)
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    };

    getParentURL = () => {
        var url = window.location.href;
        var aa = url.split("url=");
        return (aa[1])
    }

    keepAlive = () => {
        this.send({ type: 'keepalive', data: {} });
        console.log('Sent keepalive ' + ++this.keepalive_cnt + ' times!');
    }

    getLocalStream = (type, shouldFaceUser) => {
        console.log('shouldFaceUser', shouldFaceUser, (shouldFaceUser != false) ? 'user' : 'environment')
        return new Promise((pResolve, pReject) => {
            var constraints = { 
                audio: { 
                    echoCancellation: false, 
                    // googEchoCancellation: true,
                    // noiseSuppression: true,
                    // autoGainControl: true,
                }, 
                video: (type === 'video') ? { 
                    width: 1280, 
                    height: 720, 
                    frameRate: { ideal: 10, max: 15 }, 
                    facingMode:  (shouldFaceUser != false) ? 'user' : 'environment' 
                } 
                : 
                false 
            };
            var that = this;
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function (mediaStream) {
                    pResolve(mediaStream);
                }).catch((err) => {
                    console.log(err.name + ": " + err.message);
                    pReject(err);
                }
                );
        });
    }

    getRandomUserId() {
        var num = "";
        for (var i = 0; i < 6; i++) {
            num += Math.floor(Math.random() * 10);
        }
        return num;
    }

    send = (data) => {
        this.socket.send(JSON.stringify(data));
    }

    invite = (peer_id, media) => {
        this.session_id = this.self_id + '-' + peer_id;
        this.getLocalStream(media).then((stream) => {
            this.local_stream = stream;
            this.emit('localstream', stream);
            this.emit('new_call', this.self_id, this.session_id);
            this.pc1 = this.createPeerConnection(peer_id, media, true, stream);
            // this.wait(500).then(() => {
            // })
        });
    }

    onSwitchCamera = (peer_id, media, shouldFaceUser, isInviter) => {
        console.log('switch camera', peer_id, shouldFaceUser);
        let that = this;
        this.getLocalStream(media, shouldFaceUser).then((stream) => {
            that.local_stream = stream;
            that.emit('switch_camera', stream)
            let videoTrack = stream.getVideoTracks()[0];
            let targetPC = (isInviter) ? that.pc1 : that.pc2;
            var sender = targetPC.getSenders().find(function(s) {
                return s.track.kind == videoTrack.kind;
            });
            console.log('found sender:', videoTrack.kind, sender);
            sender.replaceTrack(videoTrack);

        }).catch(function(err) {
            console.error('Error happens:', err);
        });
    }

    bye = () => {
        let message = {
            type: 'bye',
            session_id: this.session_id,
            from: this.self_id,
        }
        this.send(message);
    }

    createOffer = (pc, id, media) => {
        pc.createOffer()
        .then((offer) => {
            return pc.setLocalDescription(offer);
        })
        .then(() => {
            console.log('setLocalDescription', pc.localDescription);
            let message = {
                type: 'offer',
                to: id,
                media: media,
                description: pc.localDescription,
                session_id: this.session_id,
            }
            this.send(message);
        })
        .catch((err) => {
            this.logError(err)
        })
    }

    createPeerConnection = (id, media, isOffer, localstream) => {
        var pc = new RTCPeerConnection(configuration);
        this.peer_connections["" + id] = pc;

        pc.onicecandidate = (event) => {
            console.log('onicecandidate', event);
            if (event.candidate) {
                let message = {
                    type: 'candidate',
                    to: id,
                    candidate: event.candidate,
                    session_id: this.session_id,
                }
                this.send(message);
            }
        };

        pc.onnegotiationneeded = () => {
            console.log('onnegotiationneeded');
        }

        pc.oniceconnectionstatechange = (event) => {
            console.log('oniceconnectionstatechange', event);
            if (event.target.iceConnectionState === 'connected') {
                this.createDataChannel(pc);
            }
        };

        pc.onsignalingstatechange = (event) => {
            console.log('onsignalingstatechange', event);
        };

        pc.ontrack = (event) => {
            console.log('ontrack', event);
            this.emit('addstream', event.streams[0]);
        }

        pc.onremovetrack  = (event) => {
            console.log('onremovetrack ', event);
            this.emit('removetrack ', event.streams[0]);
        };

        localstream.getTracks().forEach(track => pc.addTrack(track, localstream));

        console.log("ISOFFER", isOffer)
        if (isOffer) {
            this.createOffer(pc, id, media);
        }
        return pc;
    }

    createDataChannel = (pc) => {
        if (pc.textDataChannel) {
            return;
        }
        var dataChannel = pc.createDataChannel("text");

        dataChannel.onerror = (error) => {
            console.log("dataChannel.onerror", error);
        };

        dataChannel.onmessage = (event) => {
            console.log("dataChannel.onmessage:", event.data);
            var content = document.getElementById('textRoomContent');
            //content.innerHTML = content.innerHTML + '<p>' + socketId + ': ' + event.data + '</p>';
        };

        dataChannel.onopen = () => {
            console.log('dataChannel.onopen');
        };

        dataChannel.onclose = () => {
            console.log("dataChannel.onclose");
        };

        pc.textDataChannel = dataChannel;
    }

    onPeers = (message) => {
        var data = message.data;
        console.log("peers = " + JSON.stringify(data));
        this.emit('peers', data, this.self_id);
    }

    onOffer = (message) => {
        var data = message.data;
        var from = data.from;
        console.log("data:" + data);
        var media = data.media;
        this.session_id = data.session_id;
        this.emit('new_call', from, this.session_id);

        this.getLocalStream(media).then((stream) => {
            console.log('get localsteram on on offer')
            this.local_stream = stream;
            this.emit('localstream', stream);
            var pc = this.createPeerConnection(from, media, false, stream);
            this.pc2 = pc;
            if (pc && data.description) {
                console.log('on offer sdp', data);
                pc.setRemoteDescription(new RTCSessionDescription(data.description), () => {
                    if (pc.remoteDescription.type == "offer") {
                        pc.createAnswer()
                        .then((answer) => {
                            return pc.setLocalDescription(answer);
                        })
                        .then(() => {
                            console.log('setLocalDescription', pc.localDescription);
                            let message = {
                                type: 'answer',
                                to: from,
                                description: pc.localDescription,
                                session_id: this.session_id,
                            }
                            this.send(message);
                        })
                        .catch((err) => {
                            this.logError(err);
                        })
                    }
                }, this.logError);
            }
        });
    }

    onAnswer = (message) => {
        console.log('onAnswer', message)
        var data = message.data;
        var from = data.from;
        var pc = null;
        if (from in this.peer_connections) {
            pc = this.peer_connections[from];
        }
        console.log('onAnswerPC', pc)
        if (pc && data.description) {
            console.log('on answer sdp', data);
            pc.setRemoteDescription(new RTCSessionDescription(data.description), () => {
            }, this.logError);
        }
    }

    onCandidate = (message) => {
        console.log('onCandidate', message)
        var data = message.data;
        var from = data.from;
        var pc = null;
        if (from in this.peer_connections) {
            pc = this.peer_connections[from];
        }
        console.log('onCandidatePC', pc)
        if (pc && data.candidate) {
            console.log('addicecandidate called CALLED CALLED')
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }

    onLeave = (message) => {
        var id = message.data;
        console.log('leave', id);
        var peerConnections = this.peer_connections;
        var pc = peerConnections[id];
        if (pc !== undefined) {
            pc.close();
            delete peerConnections[id];
            this.emit('leave', id);
        }
        if (this.local_stream != null) {
            this.closeMediaStream(this.local_stream);
            this.local_stream = null;
        }
    }

    onBye = (message) => {
        var data = message.data;
        var from = data.from;
        var to = data.to;
        console.log('bye: ', data.session_id);
        var peerConnections = this.peer_connections;
        var pc = peerConnections[to] || peerConnections[from];
        if (pc !== undefined) {
            pc.close();
            delete peerConnections[to];
            this.emit('call_end', to, this.session_id);
        }
        if (this.local_stream != null) {
            this.closeMediaStream(this.local_stream);
            this.local_stream = null;
        }
        this.session_id = '0-0';
    }

    logError = (error) => {
        console.log("logError", error);
    }

    sendText() {
        var text = "test send text...";//document.getElementById('textRoomInput').value;
        if (text == "") {
            alert('Enter something');
        } else {
            //document.getElementById('textRoomInput').value = '';
            // var content = document.getElementById('textRoomContent');
            // content.innerHTML = content.innerHTML + '<p>' + 'Me' + ': ' + text + '</p>';
            for (var key in this.peer_connections) {
                var pc = this.peer_connections[key];
                pc.textDataChannel.send(text);
            }
        }
    }

    closeMediaStream = (stream) => {
        if (!stream)
            return;

        let tracks = stream.getTracks();

        for (let i = 0, len = tracks.length; i < len; i++) {
            tracks[i].stop();
        }
    }

    MyCloseMediaStream = (stream) => {
        console.log(shouldFaceUser)
        if (!stream)
            return;
        return new Promise((pResolve, pReject) => {
            let tracks = stream.getTracks();

            for (let i = 0, len = tracks.length; i < len; i++) {
                tracks[i].stop();
            }
            pResolve(mediaStream);
            var constraints = { audio: true, video: (type === 'video') ? { width: 1280, height: 720, facingMode:  (shouldFaceUser != false) ? 'user' : 'environment' } : false };
            var that = this;
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function (mediaStream) {
                    pResolve(mediaStream);
                }).catch((err) => {
                    console.log(err.name + ": " + err.message);
                    pReject(err);
                }
                );
        });
    }

    wait = (delayInMS) => {
        return new Promise(resolve => setTimeout(resolve, delayInMS));
    }
}