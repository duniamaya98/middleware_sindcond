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
    setMeter:(data)=>{
        let i=1
        let interval = null
        let set_meter = ''
        
        return new Promise((resolve, reject)=>{
           
            if (data.type==undefined || data.devEUI==undefined || data.set_meter==undefined) {
                reject(empty)
            }

            const regex = /\d+/g
            set_meter = data.set_meter
            set_meter = set_meter.toString()
            console.log(data)
            cekRegex = set_meter.match(regex)
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
                set_meter=''
                cekRegex.forEach(val=> {
                    set_meter+=val
                })
                set_meter = parseInt(set_meter)
                set_meter = set_meter.toString(16)
                console.log(set_meter)
                set_meter = ('00000000' + set_meter.toString(16)).slice(-8)
                console.log(set_meter)
                set_meter = hex64.toBase64(set_meter)
                console.log(set_meter)
            }
            const client = mqtt.connect(options)
            client.subscribe((`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`),(err)=>{
                if (err) {
                    client.end()
                    reject(connection);
                }else{
                    client.publish(`organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,JSON.stringify({"confirmed":false,"devEUI":data.devEUI,"fPort":114,"data":set_meter}))
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