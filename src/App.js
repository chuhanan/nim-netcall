import React, { Component } from 'react';
import './App.css';

// import rtc from './rtc';
import NetCallBridge from './netcall';
const nc = new NetCallBridge();

//本地配置
const localConfig = {
  debug:true,
  appKey:"6b53bb0b26217518877a91b63ec6fbf0",
  token:"testvideo",
  account:"testvideo",
  container:document.getElementById('localScreen'),
  remoteContainer:document.getElementById('remoteScreen')
}
//远程配置
const remoteConfig = {
  account:'chuhan',
}

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      count:15
    }
  }

  componentDidMount() {
    //this.setNIM(localConfig);
    nc.init(localConfig);
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  render() {
    let { count } = this.props;
    return (
      <div style={{border:"1px solid #ebebeb",padding:"15px"}}>
        <div className="screen-container">
          <div className="local-screen" id="localScreen">

          </div>
          <div className="remote-screen" id="remoteScreen">

          </div>
        </div>
        <div className="action">
          <p>
            <button
              onClick={() => {
                nc.callVideo(remoteConfig, (message) => {
                  console.log('callVideo', message)
                })
              }}
            > { count ? count : "呼叫他" }</button>
          </p>
        </div>
      </div>
    );
  }
}

export default App;
