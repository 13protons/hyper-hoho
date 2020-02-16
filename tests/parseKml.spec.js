const chai = require('chai');
const _ = require('lodash');

chai.should();
const parseKml = require('../lib/parseKml');

describe('parseKml', () => {
  let kmlString = '';
  before(() => {
    const path = require('path');
    const fs = require('fs');
    networkKmlString = fs.readFileSync(path.resolve(__dirname, './data/nightloop_network.kml'), 'utf8');
    kmlString = fs.readFileSync(path.resolve(__dirname, './data/nightloop.kml'), 'utf8');
  });

  it('should return a promise', () => {
    const later = parseKml(kmlString);
    later.then.should.be.a('Function');
  });

  describe('getNetwork', function() {
    this.timeout(5000); 
    it('should return a promise', () => {
      const later = parseKml(networkKmlString);
      later.then.should.be.a('Function');
    });
    it('should resolve to json', function(done) {
      const later = parseKml(networkKmlString);
      console.log('later?', later);
      later.then((data)=>{
        // console.log('results of later', JSON.stringify(data));
        done();
      }).catch(done);
    })
  });
});
