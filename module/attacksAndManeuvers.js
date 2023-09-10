//adds a mass combat checkbox to attacks that could be counted as masscombat actions

const _MassCombatActionCheck = `<label class="checkbox">
          <input type="checkbox" name="isMassCombatAction">Mass Combat Action
        </label>`

const _MassCombatManeuver = `<option value="maneuver">Battlefield Maneuver</option>`


Hooks.on('renderItemSheetPF', (app, html, context) => {
    //add a checkbox to the Itemsheet that determines if the item has a masscombat action
    //items with a masscombat action show up on the masscombat tab and have an alternate damage calcutaion (power + special damage modifier)
    let item = context.item;
    if (["attack", "weapon", "feat", "spell", "consumable"].includes(item.type))  {
        html.find('[name="system.showInQuickbar"]').parent().after(_MassCombatActionCheck);
        fillItemCheck(item, html);
        html.find('[name=isMassCombatAction]').on("change", function(){
            const state = $(this).prop("checked");
            setItemState(item, state);
        })
    };
    //add an option Battlefield Maneuver (shortname maneuver) to the Feats itemtype. This type of item will show up
    // on the masscombat tab of the character sheet.
    // also handle an issue where the sheet changes and is reloaded, but the tab
    if (item.type == "feat"){
        subType = html.find("section.primary-body div.tab.details [name='system.subType']");
        subType.find("[value='trait']").after(_MassCombatManeuver);
        if (item.getFlag('masscombat', 'ismaneuver')){
            subType.val('maneuver');
            html.find("div.header-details ul.summary li:first").text("Battlefield Maneuver");
        }
        subType.on("change", function(){
            item.setFlag('masscombat', 'ismaneuver', subType.val() == 'maneuver')
        })
    }
});


Hooks.on('renderItemActionSheet', (app, html, context) => {
    const item = context.item;
    const action = context.action;
    if ((typeof item.flags.masscombat != 'undefined') && (item.flags.masscombat.isMassCombatAction)) {
        setMasscombatItemActionDamage(action);
    };
    if ((item.type == 'feat') && (item.system.subType == 'maneuver')) {
        const actionType = html.find('select[name="actionType"]');
        actionType.html('<option value="discipline" selected>Discipline</option>');
    }
});


function fillItemCheck(item, html) {
    const actionState = item.flags.masscombat.isMassCombatAction;
     const checkBox = html.find('[name=isMassCombatAction]');
     checkBox.prop("checked", actionState);
};

async function setItemState(item, state) {
    // handle clicking on the masscombat checkbox
    await item.setFlag('masscombat', 'isMassCombatAction', state);
//    console.log('masscombat | ismasscombatasction', state);
    if (state) {
        for (action in item.actions){
            setMasscombatItemActionDamage(action)
        };
    };
};


Hooks.on('renderItemActionSheet', (app, html, context) => {
    const item = context.item;
    const action = context.action;
    if ((typeof item.flags.masscombat != 'undefined') && (item.flags.masscombat.isMassCombatAction)) {
        setMasscombatItemActionDamage(action);
    };
    if ((item.type == 'feat') && (item.system.subType == 'maneuver')) {
        const actionType = html.find('select[name="actionType"]');
        actionType.html('<option value="discipline" selected>Discipline</option>');
    }
});


async function setMasscombatItemActionDamage(action) {
    //set the masscombat damage value for a certain action as a flag value in the item
        let mcDamageBonus = await getMcActnDam(action);
        let actDmg = {};
        if (typeof action.item.flags.masscombat.actionDamage != 'undefined'){
            actDmg = await(action.item.getFlag('masscombat', 'actionDamage'));
        };
        actDmg[action.id] = mcDamageBonus;
        await action.item.setFlag('masscombat', 'actionDamage', actDmg);
        await action.item.setFlag('masscombat', 'allActionDamage', Object.values(actDmg).join(', '));
};



async function getMcActnDam(action) {
          // with an item, loop over all the actions and find the damage for each. Calculate the average and then apply the
          // mass combat damage bonus conversion (using damageRolltoDamageBonus)
          let dmgRoll = await action.rollDamage();
          let damBonus = 0
          let damageSet = []
          for (let dmg of dmgRoll) {
              let rMin = new Roll(dmg.formula);
              let rMax = new Roll(dmg.formula);
              rMin.evaluate({minimize:true});
              rMax.evaluate({maximize:true});
              let rAvg = (rMin.total*1 + rMax.total*1)/2;
              damageSet.push(rAvg);
          };
//          console.log("Masscombat | ", damageSet)
          let rAvgTot = damageSet.reduce((a,b) => a+b, 0);
          if (rAvgTot<4) {
              damBonus = 0
          } else {
             damBonus = Math.min(17, Math.ceil(rAvgTot/9))
          }
    return damBonus
};


function createMcDmgItm(item, mcDmg, power) {
    for (let action of item.actions) {
        dmg = {"critParts": [],
               "nonCritParts": [{"formula": power, type: {"custom": "Power", "values":[] } }],
               "parts": [{"formula": mcDmg[action.id], type: {"custom": "Weapons", "values":[]} }]
            };
        item.actions.get(action.id).data.ability.damage = '';
        item.actions.get(action.id).data.damage = dmg
    };
};
