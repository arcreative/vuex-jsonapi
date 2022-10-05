// This function uses duck typing to infer whether an object is a Record class or not since `instanceof` checks while
// using `yarn link` or `npm link` are unreliable/defunct.
export default (item) => {
    if (!item) return false;
    if (typeof item !== 'object') return false;
    if (!item.type) return false;
    if (typeof item.id === 'undefined') return false;
    return true;
};
