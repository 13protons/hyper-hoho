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
    let processed = features
      .filter((item) => {
        return item.properties.folder === data.key;
      })
      .map((item) => {
        delete item.properties.styleUrl;
        delete item.properties.styleHash;
        delete item.properties.icon;

        // console.log('processing item', item);

        if (item.geometry.type === 'Point') {
          item.properties.coord = turf.getCoord(item.geometry);
        }

        return item;
      })

    let collection = turf.featureCollection(processed, {
      id: _.kebabCase(data.name)
    })

    collection.name = data.name;
    collection.bounds = turf.bbox(collection);
    return collection;
  });

  extents = turf.featureCollection(layers.map((item)=>{
    return turf.bboxPolygon(item.bounds);
  }));

  // console.log('parsed: ', layers);
  return {
    extents: turf.bbox(extents),
    layers: layers
  }
}
