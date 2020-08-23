// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_difference
// Removed use of `includes` in favor of `indexOf` for Browser compatibility
export default (a, b) => {
  return [a, b].reduce(function(a, b) {
    return a.filter(function(value) {
      return b.indexOf(value) === -1;
    });
  });
};
