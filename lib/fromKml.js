const { parse, parseFolder, parseGeoJSON } = require('kml-utils')
const turf = require('@turf/turf');
const _ = require('lodash');

const DOMParser = require("xmldom").DOMParser;

module.exports = function(kmlString) {
  const kmlDom = new DOMParser().parseFromString(kmlString);
  const features = parse(kmlDom).geoJSON.features;
  const folders = parseFolder(kmlDom)

  const layers = folders.map((data)=>{
    // { key: '0', parent: null, name: 'Nice Places', children: [] }
    let collection = turf.featureCollection(features.filter((item)=>{
      return item.properties.folder === data.key;
    }), {
      id: _.kebabCase(data.name)
    })

    collection.name = data.name;
    return collection;
  })

  console.log('parsed: ', layers);
  return layers;
}
