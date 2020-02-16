const { parse, parseFolder, parseGeoJSON } = require('kml-utils')
const xmlParser = require('xml2json');
const toGeoJSON = require('@tmcw/togeojson');
const rp = require('request-promise');
const turf = require('@turf/turf');
const _ = require('lodash');

const xmlserializer = require('xmlserializer');
const DOMParser = require("xmldom").DOMParser;

const scrubProps = [
  'icon',
  'folder',
  'styleUrl',
  'styleHash',
  'styleMapHash'
]

module.exports = function (kmlString) {
  const kmlDom = new DOMParser().parseFromString(kmlString);

  return new Promise(function(resolve, reject) {
    const networkLinks = kmlDom.getElementsByTagName('NetworkLink');
    if (networkLinks.length > 0) {
      const uri = networkLinks[0].getElementsByTagName('href')[0].textContent
      return rp(uri)
        .then((data)=>{
          return new DOMParser().parseFromString(data);
        })
        .then((dom)=>{
          resolve(parseKml(dom));
        })
        .catch(reject);
    } else {
      try {
        var result = parseKml(kmlDom);
        resolve(result);
      } catch(err) {
        reject(err);
      }
    }
  })

  function parseKml(dom) {
    const features = parse(dom);  
    const folders = parseFolder(dom);  
    const geoJson = _.get(features, 'geoJSON', {});

    turf.featureEach(geoJson, function (item, itemIndex) {
      const folderNumber = _.get(item, 'properties.folder', -1);
      folders.forEach(function (folder, index){
        if (folder.key == folderNumber) {
          const styleUrl = _.get(item, 'properties.styleUrl', '').replace('#', '');
          const node = dom.getElementById(styleUrl);
          if (node) {
            const xmlStr = xmlserializer.serializeToString(node);
            var styleObj = xmlParser.toJson(xmlStr, { object:  true });
            var style = _.get(styleObj, 'Style', undefined);
            if (style) {
              delete style.id;
              delete style.xmlns;
              _.set(item, 'properties.style', style);
            }
          }
          
          delete item.properties.styleUrl;
          delete item.properties.styleHash;
          delete item.properties.icon;

          console.log('processing item', item);

          const id = _.get(folder, 'name', folderNumber) + '-' + _.get(item, 'properties.name', itemIndex) 
          const coord = turf.getCoord(turf.center(turf.featureCollection([
            item
          ])));

          _.set(item, 'properties.id', _.kebabCase(id));
          _.set(item, 'properties.center', coord); 
          // console.log('style obj....', styleUrl, item);

          folders[index].children.push(item);
        }
      })
    });

    const layers = folders.map(function(item) {
      const id = _.get(item, 'key', -1);
      const features = _.get(item, 'children', []);
      const layer = _.pick(item, ['name']);
      _.set(layer, 'id', id);
      _.set(layer, 'FeatureCollection', turf.featureCollection(features, {id, id}));
      _.set(layer, 'bounds', turf.bbox(_.get(layer, 'FeatureCollection')));

      return layer;
    })

    // const folders = {}
    extents = turf.featureCollection(layers.map((item) => {
      // console.log('trying to find bounds for', item)
      return turf.bboxPolygon(item.bounds);
    }));

    return {
      extents: turf.bbox(extents),
      layers: layers
    }
  }
}

/* detroit bbox
[-83.10369428913619, 42.28642298181377, -82.98797171086385, 42.37635501818623]
*/