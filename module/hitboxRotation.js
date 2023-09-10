// this module takes care of rotating the hitbox is a token image is not square
// feature-upgrade: rotate around center, not upper left corner


Hooks.on('preUpdateToken', (token, change, options, id) => {
    // check if the template Mass Combat is in the actor document
    // rotate the token if it is a masscombat token
    const massCombatItemOnSheet = !(foundry.utils.isEmpty(token.actor.items.getName("Mass Combat")));
    if (massCombatItemOnSheet) {
        setHitboxRotation(token, change.rotation)
    }
})


async function setHitboxRotation(token, rotation) {
    //rotate the token hitbox / space in line with an image rotation
    //for a sqrare image this does nothing, but for an uneven image, it prevents weird area and scaling issues
    const img = await getImgRealSize(token.texture.src);
    const tokenObj = token.toObject();
    const hitbox = {max: Math.max(tokenObj.width, tokenObj.height), min: Math.min(tokenObj.width, tokenObj.height), offset: Math.abs(tokenObj.width - tokenObj.height)/2};
    var tokendata = {};
    hitbox['scale'] = hitbox.max/hitbox.min;
    if ((45 < rotation && rotation < 135) || (225 < rotation && rotation < 315)) {
        if (img.height < img.width) {
            tokendata = {height: hitbox.max, width: hitbox.min}    //flipped hitbox, long image
        } else {
            tokendata = {height: hitbox.min, width: hitbox.max}    //flipped hitbox, tall image
        }
        tokendata['texture'] = {scaleX: hitbox.scale, scaleY: hitbox.scale}
    } else {
        if (img.height < img.width) {
            tokendata = {height: hitbox.min, width: hitbox.max}    //regular hitbox, long image
        } else {
            tokendata = {height: hitbox.max, width: hitbox.min}    //regular hitbox, tall image
        }
        tokendata['texture'] = {scaleX: 1, scaleY: 1}
    }
    await token.update(tokendata, {render: false})
}


function getImgRealSize(src) {
    //return the dimensions of an image in px
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            resolve({height: img.naturalHeight, width: img.naturalWidth});
        }
        img.onerror = function(error) {
            reject(error);
        }
        img.src = src;
    });
}
