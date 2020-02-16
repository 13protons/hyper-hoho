const { parse, parseFolder, parseGeoJSON } = require('kml-utils')
const turf = require('@turf/turf');
const _ = require('lodash');

const DOMParser = require("xmldom").DOMParser;

module.exports = function(kmlString) {
  const kmlDom = new DOMParser().parseFromString(kmlString);
  const features = parse(kmlDom).geoJSON.features;
  const folders = parseFolder(kmlDom)


  const layers = _.chain(folders)
    .map((data)=>{
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
    })
    .filter((item)=>{
      return _.get(item, 'features', []).length > 0;
    })
    .value();

  console.log('processed layers', JSON.stringify(layers));


  extents = turf.featureCollection(layers.map((item)=>{
    // console.log('trying to find bounds for', item)
    return turf.bboxPolygon(item.bounds);
  }));

  return {
    extents: turf.bbox(extents),
    layers: layers
  }
}


/* detroit bbox
[-83.10369428913619, 42.28642298181377, -82.98797171086385, 42.37635501818623]
*/