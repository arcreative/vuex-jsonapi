// From https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript#answer-10316616
// Option 3 (more efficient than other options)
const isEqual = (a,b) => {
  /*
      Array-aware equality checker:
      Returns whether arguments a and b are == to each other;
      however if they are equal-lengthed arrays, returns whether their
      elements are pairwise == to each other recursively under this
      definition.
  */
  if (a instanceof Array && b instanceof Array) {
    // assert same length
    if (a.length !== b.length)
      return false;
    // assert each element equal
    for(let i = 0; i < a.length; i++)
      if (!isEqual(a[i], b[i]))
        return false;
    return true;
  } else {
    return a === b;  // if not both arrays, should be the same
  }
};

export default isEqual;
