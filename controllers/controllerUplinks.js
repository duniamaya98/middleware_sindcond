const modelUplinks = require('../models/modelUplinks')

module.exports={
    getUplinks : (req, res) =>{
        const data = req.body
        console.log(data);
        
        modelUplinks.getUplink(data)
            .then((result)=>res.status(200).json(JSON.parse(result)))
            .catch((err)=>res.status(500).json(err))
    }
}