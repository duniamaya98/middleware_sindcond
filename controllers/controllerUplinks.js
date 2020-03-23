const modelUplinks = require("../models/modelUplinks");
const modelgateway = require("../models/gateway");
module.exports = {
  getUplinks: (req, res) => {
    const data = req.body;
    modelUplinks
      .getUplink(data)
      .then(result => res.json(result))
      .catch(err => res.json(err));
  },
  gateway: (req, res) => {
    const data = req.body;
    modelgateway
      .getUplink(data)
      .then(result => res.status(result.headers.status).json(result))
      .catch(err => res.json(err));
  },
  nonCronUplinks: (req, res) => {
    const data = req.body;
    // if (typeof(data)=="object") {
    //     console.log(JSON.parse(JSON.stringify(data)));
    //     console.log('AWD');

    // }

    modelUplinks
      .getUplinknon(data)
      .then(result => res.status(200).json(JSON.parse(result)))
      .catch(err => res.status(err.headers.status).json(err));
  }
};
