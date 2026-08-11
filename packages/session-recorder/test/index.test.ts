import RumRecorder from '../src';

describe('RumRecorder', () => {
  it('should be a function', () => {
    expect(RumRecorder.init).toBeInstanceOf(Function);
  });
});
