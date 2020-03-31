const mqtt = require('mqtt')
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
    getUplink:(data)=>{
        let i=1
        let interval = null
        let valve = ''
        return new Promise((resolve, reject)=>{
            if (data.type==undefined || data.devEUI==undefined || data.valve==undefined) {
                reject(empty)
            }

            valve = data.valve==1 ? valve="AQ==" : valve="AA=="

            const client = mqtt.connect(options)
            client.subscribe((`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`),(err)=>{
                if (err) {
                    client.end()
                    reject(connection);
                }else{
                    client.publish(`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,JSON.stringify({"confirmed":false,"devEUI":data.devEUI,"fPort":111,"data":valve}))
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