// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_extend
export default (target, ...sources) => {
    const length = sources.length;

    if (length < 1 || target == null) return target;
    for (let i = 0; i < length; i++) {
        const source = sources[i];

        for (const key in source) {
            target[key] = source[key];
        }
    }
    return target;
};
