const mqtt = require('mqtt')
const hex64 = require('hex64')
require('dotenv').config()
var options={
  port:process.env.MQTT_PORT,
  host:process.env.MQTT_HOST,
  protocol:process.env.MQTT_PROTOCOL,
  username:process.env.MQTT_USERNAME,
  password:process.env.MQTT_PASSWORD,
  }
const notfound ={
    headers:{
        status:404
    },
    body:{
        message:'Not Found'
    }
}

const empty ={
    headers:{
        status:500
    },
    body:{
        message:'field cannot empty'
    }
}

const connection ={
    headers:{
        status:500
    },
    body:{
        message:'Connection closed'
    }
}
module.exports={
    adjustInterval:(data)=>{
        console.log(data)
        
        let i=1
        let interval = null
        let intervalAlat = ''
        let cekRegex
        return new Promise((resolve, reject)=>{
           
            if (data.type==undefined || data.devEUI==undefined || data.interval==undefined) {
                reject(empty)
            }
            const regex = /\d+/g
            intervalAlat = data.interval
            console.log(intervalAlat)
            cekRegex = intervalAlat.match(regex)
            if (cekRegex==null) {
                return reject({
                    headers:{
                        status:500
                    },
                    body:{
                        message:'bad input'
                    }
                })
            } else {
                intervalAlat=''
                cekRegex.forEach(val=> {
                    intervalAlat+=val
                })
                intervalAlat = parseInt(intervalAlat)
                intervalAlat = intervalAlat.toString(16)
                intervalAlat = ('00000000' + intervalAlat.toString(16)).slice(-8)
                intervalAlat = hex64.toBase64(intervalAlat)
            }
        
            const client = mqtt.connect(options)
            client.subscribe((`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`),(err)=>{
                if (err) {
                    client.end()
                    reject(connection);
                }else{
                    client.publish(`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,JSON.stringify({"confirmed":false,"devEUI":data.devEUI,"fPort":113,"data":intervalAlat}))
                    interval=setInterval(()=>{
                        i++
                        if(i==15) {
                            reject(notfound);
                            clearInterval(interval)
                            i=1;
                        }
                    },1000)
                }
            })
            client.on('message', (topic, message, packet) => {
                clearInterval(interval)
                resolve(message.toString())
                client.end()
            });
        })
    }
}