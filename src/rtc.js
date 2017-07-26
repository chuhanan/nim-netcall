/**
 * 导出整个webRTC的api
 */

//网易云的nim
const NIM = window.NIM;
//使用webrtc
const WebRTC = window.WebRTC;
//定义回调参数类型字符串
const callbackType = {
  hangup:"超时未接听",
  offline:"对方不在线"
}
const selfDom = document.getElementById('localScreen');
const remoteDom = document.getElementById('remoteScreen');
let nim = null;

/**
 * gods api !
 * 
 */
const rtc = {

  //呼叫时间定时器,超时就挂断
  callTimer:null,

  //自身容器
  selfDom:document.getElementById('localScreen'),
  //远程容器
  remoteDom:document.getElementById('remoteScreen'),

  //netcall实例
  netcall:null,

  //nim实例
  nim:null,

  //是否被叫
  beCalling:false,

  //被叫信息
  beCalledInfo:null,

  //1.使用网易云插件
  setNIM({debug, appKey, account, token, container, remoteContainer}){
    NIM.use(WebRTC);
    //2.获取网易云实例
    this.nim = NIM.getInstance({
      debug:debug || false,
      appKey: appKey,
      account: account,
      token: token,
      onconnect: this.onConnect,
      onwillreconnect: this.onWillReconnect,
      ondisconnect: this.onDisconnect,
      onerror: this.onError
    });
  },


  //清除定时器
  clearCallTimer(){
    clearTimeout(this.callTimer);
  },

  //监听到双方都准备OK后的操作
  allAccept(netcall){
    netcall.on('callAccepted', res => {
      console.log('双方都准备就绪');
      //清除未接听的定时器
      this.clearCallTimer();
      //监听一方挂断, 对方接收到信息
      this.listenHangup();
      //监听设备状态变化
      this.onDeviceStatusChange();
      //定义连续可调用的对象
      let promise;
      //判断发起的是音视频通话
      if(res.type === WebRTC.NETCALL_TYPE_VIDEO){
        promise = this.startDeviceVideo(netcall).then(() => {
          netcall.startLocalStream();
        })
      }else{
        promise = this.stopDeviceVideo(netcall);
      }
      promise.then(() => {
        return this.startDeviceAudioIn(netcall)
      }).then(() => {
        return netcall.startRtc();
      }).then(() => {
        return this.startDeviceAudioOutChat(netcall);
      }).then(() => {
        if(res.type === WebRTC.NETCALL_TYPE_VIDEO){
          return netcall.startRemoteStream();
        }
      })
    });
  },

  //开启自己的摄像头
  startDeviceVideo(netcall){
    return netcall.startDevice({
      type:WebRTC.DEVICE_TYPE_VIDEO
    }).then(() => {
      netcall.control({
        command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON
      })
    }).catch(() => {
      console.log('启动摄像头失败')
      netcall.control({
        command:WebRTC.NETCALL_CONTROL_SELF_CAMERA_INVALID
      })
    })
  },

  //关闭自己的摄像头
  stopDeviceVideo(netcall){
    return netcall.stopDevice(WebRTC.DEVICE_TYPE_VIDEO).then(() => {
      netcall.control({
        command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF
      })
    })
  },

  //开启自己的麦克风
  startDeviceAudioIn(netcall){
    return netcall.startDevice({
      type:WebRTC.DEVICE_TYPE_AUDIO_IN
    }).then(() => {
      //通知对方自己开启了麦克风
      netcall.control({
        command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON
      })
    }).catch(() => {
      console.log("启用麦克风失败!");
    })
  },

  //关闭麦克风
  stopDeviceAudioIn(netcall){
    return netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_IN).then(() => {
      //通知对方自己关闭了麦克风
      netcall.control({
        command:WebRTC.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF
      })
    })
  },

  //播放自己的声音 - 调试
  startDeviceAudioOutLocal(netcall){
    return netcall.startDevice({
      type:WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
    }).catch(() => {
      console.log("播放自己的声音失败")
    })
  },

  //关闭自己的声音 - 调试
  stopDeviceAudioOutLocal(netcall){
    return netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL);
  },

  //启动播放对方声音
  startDeviceAudioOutChat(netcall){
    return netcall.startDevice({
      type:WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT
    }).catch(() => {
      console.log("播放对方的声音失败")
    })
  },

  //关闭播放对方的声音
  stopDeviceAudioOutChat(netcall){
    return netcall.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT);
  },

  //清理操作
  resetWhenHangup(netcall){
    this.beCalledInfo = null;
    this.beCalling = false;
    this.clearCallTimer();
    netcall.stopLocalStream();
    netcall.stopRemoteStream();
    this.stopDeviceAudioIn(netcall);
    netcall.stopDeviceAudioOutChat();
    netcall.stopDeviceAudioOutLocal();
    netcall.stopDeviceVideo();
  },

  //挂断
  hangup(netcall){
    netcall.hangup();
    this.resetWhenHangup(this.netcall);
  },

  
  /**
   * 发起呼叫
   * 
   * @param {string} [account='testvideo'] 
   * @param {any} [pushConfig={}] 
   * @param {any} [sessionConfig={}] 
   * @param {any} [callback=() => {}] 
   */
  callVideo(account = 'testvideo', pushConfig = {}, sessionConfig = {}, callback = () => {}){
    let type = WebRTC.NETCALL_TYPE_VIDEO;
    //4. 发起呼叫
    this.netcall.call({
      type,
      account,
      pushConfig,
      sessionConfig
    }).then(obj => {
      console.log('对方接受了你的请求', obj)
      //监听双方是否已经就绪
      this.allAccept(this.netcall);
      // 设置超时计时器
      this.callTimer = setTimeout(() => {
        if (!this.netcall.callAccepted) {
          console.log('超时未接听, hangup')
          callback && callback(callbackType.hangup);
          //hangup()
        }
      }, 1000 * 10)
    }, err => {
      // 被叫不在线
      if (err.code === 11001) {
        console.log('callee offline', err)
        callback && callback(callbackType.offline)
      }
    })
  },

  /**
   * 监听连接成功
   * 
   *  
   * 
   */
  onConnect(){
    console.log("连接成功");

    //3.获取webrtc实例
    this.netcall = WebRTC.getInstance({
      nim: window.nim,
      container: this.selfDom,
      remoteContainer: this.remoteDom
    });
    //监听是否被叫
    this.beenCalling(this.netcall);
  },

  beenCalling(netcall){
    netcall && netcall.on('beCalling', (res) => {
      console.log('有人呼叫你')
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
      //开始接听
      netcall.initSignal().then(() => {
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
        console.log('接听失败')
      })
    })
  },

  /**
   * 监听一方挂断,另一方会收到通知
   * 
   */
  listenHangup(){
    this.netcall.on('hangup', (res) => {
      console.log('对方挂断了!');
      this.resetWhenHangup();
    })
  },

  /**
   * 监听设备状态变化
   * 
   */
  onDeviceStatusChange(){
    this.netcall.on('deviceStatus', res => {
      console.log('device status', res)
    })
  },

  /**
   * 监听重连
   * 
   * @param {any} obj 
   */
  onWillReconnect(obj){
    console.log("重连中")
  },

  /**
   * 监听断线
   * 
   */
  onDisconnect(){
    console.log("断线...")
  },

  /**
   * 监听错误
   * 
   */
  onError(){
    console.log("发生错误")
  }
}
export default rtc;