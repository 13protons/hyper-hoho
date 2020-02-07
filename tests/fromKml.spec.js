const chai = require('chai');
const _ = require('lodash');

chai.should();
const fromKml = require('../lib/fromKml');

describe('fromKml', () => {
  let kmlString = '';
  before(() => {
    const path = require('path');
    const fs = require('fs');
    kmlString = fs.readFileSync(path.resolve(__dirname, './hoho.kml'), 'utf8');
  });

  it('should return an array of layers', () => {
    const data = fromKml(kmlString);
    _.isArray(data).should.be.ok;
  });
});
