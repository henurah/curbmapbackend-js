var mongoose = require('mongoose');
var GeoJSON = require('mongoose-geojson-schema');
require('dotenv').config({path: '../curbmap.env'});
var uri = 'mongodb://' + process.env.MONGO_SHARD_0 + ',' + process.env.MONGO_SHARD_1 + ',' + process.env.MONGO_SHARD_2 +
        '/' + process.env.MONGO_DB + '?ssl=true';
mongoose.connect(uri, {
    user: process.env.MAPDB_USERNAME,
    pass: process.env.MAPDB_PASSWORD,
    auth: {
        authdb: 'admin'
    },
    replset: { rs_name: process.env.MONGO_REPLSET }
});
// mongoose.connect(uri);
mongoose.Promise = require('bluebird');

var RestrSchema = new mongoose.Schema({
    "t": String,
    "d": String,
    "s": String,
    "e": String,
    "u": String,
    "b": String,
    "c": Number,
    "l": Number,
    "p": Number,
    "r": Number
});

var PointsSchema = new mongoose.Schema({
    "point": [Number, Number],
    "restrs": [RestrSchema]
});

var MapLineSchema = new mongoose.Schema({
    "gid": Number,
    "cams_id": Number,
    "fullname": String,
    "status": String,
    "type": String,
    "city_l": String,
    "from_l": Number,
    "to_l": Number,
    "zip_l": Number,
    "city_r": String,
    "from_r": Number,
    "to_r": Number,
    "zip_r": Number,
    "odd_l": Boolean,
    "loc": {type: mongoose.Schema.Types.LineString, index: '2dsphere'},
    "points": [PointsSchema],
    "restrs": [[String]]
}, {collection: 'MapLines'});

var MapLines = mongoose.model('MapLines', MapLineSchema);

module.exports.model = MapLines;
