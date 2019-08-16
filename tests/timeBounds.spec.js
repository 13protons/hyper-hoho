const chai = require('chai');
chai.should();

const timeBounds = require('../lib/timeBounds');

describe("timeBounds", function() {
  it("should return ", function() {
    let inBounds = timeBounds([])
    inBounds.should.be.a('boolean')
  });

  it("should return false when all time in past", function () {
    let inBounds = timeBounds([{
      startSharing: Date.now() - (1000 * 60 * 2),
      endSharing: Date.now() - (1000 * 60 * 1)
    }])
    inBounds.should.be.not.ok;
  });

  it("should return false when all times in future", function () {
    let inBounds = timeBounds([{
      startSharing: Date.now() + (1000 * 60 * 1),
      endSharing: Date.now() + (1000 * 60 * 2)
    }])
    inBounds.should.be.not.ok;
  });

  it("should return false start in past and end in future", function () {
    let inBounds = timeBounds([{
      startSharing: Date.now() - (1000 * 60 * 1),
      endSharing: Date.now() + (1000 * 60 * 1)
    }])
    inBounds.should.be.ok;
  });

  it("should return true if any date pair is in valid", function () {
    let inBounds = timeBounds([
      {
        startSharing: Date.now() + (1000 * 60 * 1),
        endSharing: Date.now() + (1000 * 60 * 2)
      },{
        startSharing: Date.now() - (1000 * 60 * 1),
        endSharing: Date.now() + (1000 * 60 * 1)
      },
      {
        startSharing: Date.now() - (1000 * 60 * 2),
        endSharing: Date.now() - (1000 * 60 * 1)
      }
    ]);
    inBounds.should.be.ok;
  });
});