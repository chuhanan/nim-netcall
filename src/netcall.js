const WebRTC = window.WebRTC;
class NetCallBridge{
  //netcall 实例
  netcall = null;
  //nim 实例
  nim = null;
  //呼叫超时定时器
  callTimer = null;
  //是否正在被叫标识
  beCalling = false;
  //一次通话信息
  beCalledInfo = null;
  //音视频流配置
  sessionConfig = {
    videoQuality:WebRTC.CHAT_VIDEO_QUALITY_NORMAL,
    videoFrameRate:WebRTC.CHAT_VIDEO_FRAME_RATE_NORMAL,
    recordVideo:false,
    recordAudio:false,
    highAudio:false
  }

  init = (config) => {
    this.initNetcall(config)
  }  

  initNetcall = ({debug, appKey, account, token}) => {
    const NIM = window.NIM;
    NIM.use(WebRTC);
    this.nim = NIM.getInstance({
      debug:false,
      appKey: appKey,
      account: account,
      token: token,
      onconnect: this.onConnect,
      onwillreconnect: this.onWillReconnect,
      ondisconnect: this.onDisconnect,
      onerror: this.onError
    });
  }

  callVideo(account = 'testvideo', pushConfig = {}, sessionConfig = this.sessionConfig, callback = () => {}){
    let type = WebRTC.NETCALL_TYPE_VIDEO;
    //4. 发起呼叫
    this.netcall.call({
      type,
      account:'testvideo',
      pushConfig,
      sessionConfig:this.sessionConfig
    }).then(obj => {
      //this.log('callVideo:对方收到了你的请求', obj)
      // 设置超时计时器
      this.callTimer = setTimeout(() => {
        if (!this.netcall.callAccepted) {
          this.log('callVideo:超时未接听, hangup')
          callback && callback("超时未接听!");
          //hangup()
        }
      }, 1000 * 10)
    }, err => {
      // 被叫不在线
      if (err.code === 11001) {
        this.log('callVideo:callee offline', err)
        callback && callback("对方不在线!")
      }
    })
  }

  //双方连接成功
  onConnect = () => {
    this.log('连接成功')
    //连接成功后获取webrtc实例
    const netcall = this.netcall = WebRTC.getInstance({
      nim: this.nim,
      container:document.getElementById('localScreen'),
      remoteContainer:document.getElementById('remoteScreen')
    });
    console.log('net call', netcall)
    //监听是否被叫
    netcall.on('beCalling', this.onBeCalling);
    //监听双方是否准备就绪
    netcall.on('callAccepted', this.callAccepted);
    //监听通话是否被拒绝
    netcall.on("callRejected", this.onCallingRejected);
    //监听指令
    netcall.on("control", this.onControl);
    //信号关闭了
    netcall.on('signalClosed', this.signalClosed);
    //监听一方挂断,另一方会收到通知
    netcall.on('hangup', this.resetWhenHangup);
    //监听设备
    netcall.on('devices', this.onDevices);
    //监听设备状态变化
    netcall.on('deviceStatus', this.onDevicesStatusChange);
    //其他终端上线
    netcall.on("callerAckSync", this.onCallerAckSync);
    //网络变化
    netcall.on("netStatus", this.onNetStatus);
  }

  //监听网络监听变化
  onNetStatus = (obj) => {
    this.log('网络状态变化了', obj)
  }

  //其他终端上线
  onCallerAckSync = (obj) => {
    this.log('其他终端上线', obj)
  }

  //监听指令
  onControl = (obj) => {
    const netcall = this.netcall;
    this.log("on control:");
    // 如果不是当前通话的指令, 直接丢掉
    if (netcall.notCurrentChannelId(obj)) {
        this.log("非当前通话的控制信息");
        return;
    }

    /** 如果是多人音视频会话，转到多人脚本处理 */
    

    var type = obj.type;
    switch (type) {
        // NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON 通知对方自己打开了音频
        case WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON:
            this.log("对方打开了麦克风");
            break;
        // NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF 通知对方自己关闭了音频
        case WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF:
            this.log("对方关闭了麦克风");
            break;
        // NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON 通知对方自己打开了视频
        case WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON:
            this.log("对方打开了摄像头");
            break;
        // NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF 通知对方自己关闭了视频
        case WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF:
            this.log("对方关闭了摄像头");
            break;
        // NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_REJECT 拒绝从音频切换到视频
        case WebRTC.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_REJECT:
            this.log("对方拒绝从音频切换到视频通话");
            //this.requestSwitchToVideoRejected();
            break;
        // NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO 请求从音频切换到视频
        case WebRTC.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO:
            this.log("对方请求从音频切换到视频通话");
            // if (this.requestSwitchToVideoWaiting) {
            //     this.doSwitchToVideo();
            // } else {
            //     this.beingAskSwitchToVideo();
            // }
            break;
        // NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE 同意从音频切换到视频
        case WebRTC.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE:
            this.log("对方同意从音频切换到视频通话");
            // if (this.requestSwitchToVideoWaiting) {
            //     this.doSwitchToVideo();
            // }
            break;
        // NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO 从视频切换到音频
        case WebRTC.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO:
            this.log("对方请求从视频切换为音频");
            //this.doSwitchToAudio();
            break;
        // NETCALL_CONTROL_COMMAND_BUSY 占线
        case WebRTC.NETCALL_CONTROL_COMMAND_BUSY:
            this.log("对方正在通话中");
            this.netcall.hangup();
            this.clearCallTimer();
            //this.isBusy = true;
            //this.sendLocalMessage("对方正在通话中");
            // function doEnd() {
            //     this.cancelCalling();
            // }
            //doEnd = doEnd.bind(this);
            // if (this.afterPlayRingA) {
            //     this.afterPlayRingA = function () {
            //         this.playRing("C", 3, function () {
            //             this.showTip("对方正在通话中", 2000, doEnd);
            //         }.bind(this));
            //     }.bind(this);
            // } else {
            //     this.clearRingPlay();
            //     this.playRing("C", 3, function () {
            //         this.showTip("对方正在通话中", 2000, doEnd);
            //     }.bind(this));
            // }
            break;
        // NETCALL_CONTROL_COMMAND_SELF_CAMERA_INVALID 自己的摄像头不可用
        case WebRTC.NETCALL_CONTROL_COMMAND_SELF_CAMERA_INVALID:
            this.log("对方摄像头不可用");
            break;
        // NETCALL_CONTROL_COMMAND_SELF_ON_BACKGROUND 自己处于后台
        // NETCALL_CONTROL_COMMAND_START_NOTIFY_RECEIVED 告诉发送方自己已经收到请求了（用于通知发送方开始播放提示音）
        // NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_START 通知对方自己开始录制视频了
        // NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_STOP 通知对方自己结束录制视频了
        default :
          return false;
    }
  }

  //信号关闭了
  signalClosed = () => {
    this.log('信号关闭了');
    this.resetWhenHangup();
  }

  //监听设备
  onDevices = (res) => {
    this.log('onDevices', res)
  }

  //监听通话是否被拒绝
  onCallingRejected = (res) => {
    this.log('onCallingRejected', res)
  }

  //设备变化
  onDevicesStatusChange = (res) => {
    this.log('device status', res)
  }

  //视频通话开始
  callAccepted = (res) => {
    const netcall = this.netcall;
    this.log('视频通话开始');
    //清除未接听的定时器
    this.clearCallTimer();
    //连续调用的promise
    let promise;
    //判断发起的是音视频通话
    if(res.type === WebRTC.NETCALL_TYPE_VIDEO){
      promise = this.setDeviceVideo(true).then(() => {
        this.log('开启本地流')
        return netcall.startLocalStream();
      });
      promise.then(() => {
        this.log('开启语音')
        return this.setDeviceAudioIn(true);
      }).then(() => {
        return netcall.startRtc();
      }).then(() => {
        this.log('开启远程语音')
        return this.setDeviceAudioOutChat(true);
      }).then(() => {
        this.log('开启远程视频')
        netcall.startRemoteStream();
        netcall.setVideoShow('chuhan');
      })
    }else{
      this.log('语音通话')
      this.setDeviceAudioIn(true);
      this.setDeviceAudioOutChat(true);
      this.setDeviceAudioOutLocal(false);
      // this.setDeviceVideo(false);
    }
  }

  
  //监听被叫
  onBeCalling = (res) => {
    this.log('有人呼叫你')
    const netcall = this.netcall;
    //获取每次通话的唯一id
    const { channelId } = res;
    //通知对方自己已经收到通知
    netcall.control({
      channelId,
      command:WebRTC.NETCALL_CONTROL_COMMAND_START_NOTIFY_RECEIVED
    })
    //只有在没有通话并且没有被叫的时候才记录被叫信息,否则直接挂断
    if(!netcall.calling && !this.beCalling){
      this.beCalling = true;
      this.beCalledInfo = res;
    }else{
      //通知对方我方繁忙
      netcall.control({
        channelId,
        command:WebRTC.NETCALL_CONTROL_COMMAND_BUSY
      })
    }
    // //开始接听
    netcall.initSignal().then(() => {
      console.log("this.beCalledInfo", this.beCalledInfo)
      return netcall.response({
        accepted:true,
        beCalledInfo:this.beCalledInfo
      })
    }).catch(() => {
      netcall.control({
        channelId,
        command:WebRTC.NETCALL_CONTROL_COMMAND_BUSY
      });
      this.beCalledInfo = null;
      this.log('接听失败')
    })
  }

  //设置自己的摄像头
  setDeviceVideo(state){
    const netcall = this.netcall;
    if(state){
      return netcall.startDevice({
        type:WebRTC.DEVICE_TYPE_VIDEO
      }).then(() => {
        netcall.control({
          command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON
        })
      }).catch(() => {
        this.log('启动摄像头失败')
        netcall.control({
          command:WebRTC.NETCALL_CONTROL_SELF_CAMERA_INVALID
        })
      })
    }else{
      return netcall.stopDevice(WebRTC.DEVICE_TYPE_VIDEO).then(() => {
        netcall.control({
          command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF
        })
      })
    }
  }

  //设置自己的麦克风
  setDeviceAudioIn(state){
    if(state){
      return this.netcall.startDevice({
        type:WebRTC.DEVICE_TYPE_AUDIO_IN
      }).then(() => {
        //通知对方自己开启了麦克风
        this.netcall.control({
          command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON
        })
      }).catch(() => {
        this.log("启用麦克风失败!");
      })
    }else{
      return this.netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_IN).then(() => {
        //通知对方自己关闭了麦克风
        this.netcall.control({
          command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF
        })
      })
    }
  }

  //设置播放自己的声音 - 调试
  setDeviceAudioOutLocal(state){
    const netcall = this.netcall;
    if(state){
      return netcall.startDevice({
        type:WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
      }).catch(() => {
        this.log("播放自己的声音失败")
      })
    }else{
      return netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL);
    }
  }

  //设置播放对方声音
  setDeviceAudioOutChat(state){
    if(state){
      return this.netcall.startDevice({
        type:WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT
      }).catch(() => {
        this.log("播放对方的声音失败")
      })
    }else{
      return this.netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT);
    }
  }

  //清理函数
  resetWhenHangup(){
    const nc = this.netcall;
    this.beCalledInfo = null;
    this.beCalling = false;
    this.clearCallTimer();
    nc.stopLocalStream();
    nc.stopRemoteStream();
    this.setDeviceAudioIn(false);
    this.setDeviceAudioOutChat(false);
    this.setDeviceAudioOutLocal(false);
  }

  clearCallTimer = () => {
    clearTimeout(this.callTimer);
  }

  onWillReconnect = (obj) => {
    this.log('重连中')
  }

  onDisconnect = () => {
    this.log('断线了')
  }

  onError = (e) => {
    this.log('发生错误', e)
  }

  log(){
    //let arr = Array.prototype.slice.call(arguments)
    let arr = Array.from(arguments)
    for (var i = 0; i < arr.length; i++) {
      if(typeof arr[i] === 'object'){
        console.log(arr[i])
      }else{
        console.log("%c" + arr[i], "color: orange;font-size:14px;")
      }
    }
  }
}

export default NetCallBridge;