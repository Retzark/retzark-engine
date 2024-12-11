const mongoose = require('mongoose');

const retRewardSchema = new mongoose.Schema({
    rewards: {
        type: Object,
        required: true,
        default: {
            'rookie1': 14.784372086975955,
            'rookie2': 29.56874417395191,
            'rookie3': 44.80112753629077,
            'adept1': 59.585499623266735,
            'adept2': 74.36987171024268,
            'adept3': 89.60225507258154,
            'expert1': 104.3866271595575,
            'expert2': 119.17099924653347,
            'expert3': 134.40338260887233,
            'master1': 149.18775469584827,
            'master2': 163.97212678282423,
            'master3': 179.20451014516308,
            'grandmaster1': 193.98888223213905,
            'grandmaster2': 208.773254319115,
            'grandmaster3': 224.0056376814539,
            'champion1': 238.7900097684298,
            'champion2': 253.57438185540576,
            'champion3': 268.80676521774467,
            'legend1': 283.59113730472063,
            'legend2': 298.37550939169654,
            'legend3': 313.6078927540354,
            'myth1': 328.39226484101135,
            'myth2': 343.17663692798726,
            'myth3': 358.40902029032617,
            'transcendent': 448.0112753629078
        }
    }
});

module.exports = mongoose.model('RetReward', retRewardSchema);
