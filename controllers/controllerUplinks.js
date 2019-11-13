const modelUplinks = require('../models/modelUplinks')

module.exports={
    getUplinks : (req, res) =>{
        const data = req.body
        // if (typeof(data)=="object") {
        //     console.log(JSON.parse(JSON.stringify(data)));
        //     console.log('AWD');
                
        // }
        
        modelUplinks.getUplink(data)
            .then((result)=>res.status(200).json(JSON.parse(result)))
            .catch((err)=>res.status(err.headers.status).json(err))
    }
}