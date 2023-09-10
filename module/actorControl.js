Hooks.once('init', () => {
    loadTemplates(templates);
})


Hooks.on('renderActorSheetPFNPC', (app, html, context) => {
    //add the mass-combat tab to the sheet navigation
    const actor = context.actor;
    const massCombatItemOnSsheet = !(foundry.utils.isEmpty(context.actor.items.getName("Mass Combat")))
    if (massCombatItemOnSsheet) {
        addMassCombatTab(html, actor);
    };
});


async function updateActor(actor, data) {
    //handle changing any of the masscombat stats
    troopData = getAllTroopData(actor);
    if ('flags.masscombat.strength' in data) {
        let strength = troopData.strength
        let str =  data['flags.masscombat.strength']*1 // convert string to number
        // handling damage. If the value is lower than 0, assume the value is damage
        // and subtract it from the current strength value
        // otherwise, assume its is the new strength value and update it.
        // the same logic is used for troopsize below
        if (str < 0) {
            strength = strength + str;
        } else {
            strength = str;
        };
        strength = Math.min(strength, troopData.maxSize*troopData.HD)
        data['flags.masscombat.strength'] = strength;
        data['flags.masscombat.currentSize'] = Math.ceil(strength / troopData.HD)
    } else if ('flags.masscombat.maxSize' in data) {
         let maxSize =  troopData.maxSize;
         let ts =  data['flags.masscombat.maxSize']*1 // convert string to number
        if (ts < 0) {
        // handle troopsize. See comment at strength for an explenation of the logic
            maxSize = maxSize + ts;
        } else {
            maxSize = ts;
        };
        data['flags.masscombat.strength'] = Math.min(troopData.strength, maxSize*troopData.HD);
        data['flags.masscombat.maxSize'] = maxSize;
    } else {
        for(k of Object.keys(data)){
            data[k] = data[k]*1 // convert string to number
        }
    }
    await actor.update(data, {render: false});
    fillTroopSheet(actor);
};



function fillTroopSheet(actor) {
    // add the relevant data troop to the masscombat tab
    const troopData = getAllTroopData(actor);
    const massCombatTab = actor.sheet.element.find("div.tab.masscombat");
    massCombatTab.find(".currentSize").val(troopData.currentSize);
    massCombatTab.find(".maxSize").val(troopData.maxSize);
    massCombatTab.find(".power").text(troopData.power);
    massCombatTab.find(".armorClass").text(troopData.ac);
    massCombatTab.find(".strength").val(troopData.strength);
    massCombatTab.find(".discipline").val(troopData.discipline);
    massCombatTab.find(".disciplineRoll").text(troopData.disciplineRoll);
    massCombatTab.find(".morale").text(troopData.morale);
    massCombatTab.find(".leadership").val(troopData.leadership);
};


async function addMassCombatTab(html, actor) {
    //create the masscombat tab
    //fill the dab with data
    //register all the event listners
    const combat_tab = html.find(".sheet-navigation a:nth-child(3)");
    const combat_body = html.find("div.tab.combat");
    const troopSheet = await renderTemplate(`modules/masscombat/templates/actor/masscombat-actor-tab.hbs`, actor)
    combat_tab.after(_tab);
    combat_body.after(troopSheet);
    fillTroopSheet(actor);
        html.find("div.tab.masscombat .maxSize").on("change", function(){
            const data  = {'flags.masscombat.maxSize': $(this).val()};
            updateActor(actor, data);
        });
        html.find("div.tab.masscombat .strength").on("change", function(){
            const data  = {'flags.masscombat.strength': $(this).val()};
            updateActor(actor, data);
        });
        html.find("div.tab.masscombat .discipline").on("change", function(){
            const data  = {'flags.masscombat.discipline': $(this).val()};
            updateActor(actor, data);
        });
            html.find("div.tab.masscombat .leadership").on("change", function(){
            const data  = {'flags.masscombat.leadership': $(this).val()};
            updateActor(actor, data);
        });
        html.find("div.tab.masscombat .roll-discipline").on("click", function(){
            pf1.dice.d20Roll({rollData: getAllTroopData(actor),
                                 parts: [`@disciplineRoll[discipline]`],
                                flavor: " Discipline" ,
                               speaker: {actor: actor.id},})
        });
        html.find("div.tab.masscombat .roll-morale").on("click", function(){
            pf1.dice.d20Roll({rollData: getAllTroopData(actor),
                                 parts: [`@morale[morale]`],
                                flavor: " Morale",
                               speaker: {actor: actor.id}})
        });
        html.find("div.tab.masscombat .item-image").on("click", function(){
            const itemId = $(this).closest("li").attr("data-item-id");
            actor.items.get(itemId).displayCard();
        });

        html.find("div.tab.masscombat .replaceCasualties").on("click", function(){
            replaceCasualties(actor);
        });
        html.find("div.tab.masscombat a.item-mcaction").on("click", function(){
            const itemId = $(this).closest("li").attr("data-item-id");
            let item = actor.items.get(itemId);
            const mcDmg = item.getFlag("masscombat", "actionDamage");
            const power = getAllTroopData(actor).power;
            createMcDmgItm(item, mcDmg, power);
            item.use();
        });

        html.find("div.tab.masscombat a.item-mcmaneuver i").on('hover', function(){
            this.addClass('fa-shake')
        });
        html.find("div.tab.masscombat a.item-mcmaneuver").on("click", function(){
            const itemId = $(this).closest("li").attr("data-item-id");
            let item = actor.items.get(itemId);
            console.log('masscombat', 'triggering mcmaneuver')
            item.use();
            pf1.dice.d20Roll({rollData: getAllTroopData(actor),
                                 parts: [`@disciplineRoll[discipline]`],
                                flavor: " Discipline" ,
                               speaker: {actor: actor.id},})
        });
        html.find("div.tab.masscombat a.item-edit").on("click", function(){
            const itemId = $(this).closest("li").attr("data-item-id");
            actor.items.get(itemId).sheet.render(true);
        });
        html.find("div.tab.masscombat a.item-copy").on("click", function(){
            itemId = $(this).closest("li").attr("data-item-id");
            Item.create(actor.items.get(itemId).toObject(), {parent: actor });
        });
        html.find("div.tab.masscombat a.item-delete").on("click", function(){
            itemId = $(this).closest("li").attr("data-item-id");
            actor.items.get(itemId).delete();
        });
};


function getAllTroopData(actor) {
        //collect all the troop data to render on the masscombat _tab
        // also handle the case that no data has been set (yet) and assume a medium troop of 100 units
        const HD = actor.system.attributes.hd.total;
        const Ac = actor.system.attributes.ac.normal.total;
        const Will = actor.system.attributes.savingThrows.will.total;
        var MaxSize = actor.flags.masscombat.maxSize;
        var DiscMod = actor.flags.masscombat.discipline;
        var Strength = actor.flags.masscombat.strength;
        var Leadership = actor.flags.masscombat.leadership;

        if (typeof MaxSize == 'undefined') {
            MaxSize = 100
        };
        if (typeof Strength == 'undefined') {
            Strength = maxSize * HD
        };
        if (typeof DiscMod == 'undefined') {
            DiscMod = 0
        };
        if (typeof Leadership == 'undefined') {
            Leadership = 0
        };
        const stats = {
            currentSize: Math.ceil(Strength / HD),
            maxSize: MaxSize,
            strength: Strength,
            ac: Ac,
            HD: HD,
            power: Math.ceil(Strength/(HD*10)),
            discipline: DiscMod,
            disciplineRoll: DiscMod+Leadership,
            morale: DiscMod+Will+Leadership,
            leadership: Leadership,
        }
        return stats
    }


async function replaceCasualties(actor){
    //show a dialog to replace the casualties
    let troopData = getAllTroopData(actor);
    let maxtroops = troopData['maxSize']
    let newRecruits = troopData['maxSize']-troopData['currentSize']
    let recruitCard = await renderTemplate('modules/masscombat/templates/recruitChatMessage.hbs',
                         {actorID: actor.id,
                         recruits: newRecruits}
                            );
    let massCombatRecruit = {content: recruitCard,
                             speaker: {actor: actor.id},
                             whisper: []};

    let replaceCasualtiesDialogData = {
        title: "Replace unit's casualties",
        content: `<div class='actorID-holder' data-actor-id='${actor.id}'</div><p>heal or replace the unit's casualties, bringing it back to full strength</p>`,
        buttons: {
            cancel: {
                icon: '<i class="fas fa-xmark"></i>',
                label: "let them bleed",
                callback: () => {false}
            },
             replace: {
                 icon: '<i class="fas fa-kit-medical"></i>',
                 label: "save them",
                 callback: () => {

 //                    console.log('masscombat |', troopData, maxtroops, recruits)
                     updateActor(actor, {'flags.masscombat.strength': troopData['maxSize'] * troopData['HD'] });
                     ChatMessage.create(massCombatRecruit);
                }
             }
        },
        default: "cancel",
    };
    let dialog = new Dialog(replaceCasualtiesDialogData);
    dialog.render(true)
}



const templates = [
      `modules/masscombat/templates/actor/masscombat-actor-tab.hbs`,
      `modules/masscombat/templates/recruitChatMessage.hbs`,
      `modules/masscombat/templates/actor/parts/statrow.hbs`,
      `modules/masscombat/templates/actor/parts/maneuvers.hbs`,
      `modules/masscombat/templates/actor/parts/actions.hbs`
    ];

const _tab = `<a class="item" data-tab="mass-combat">Mass-Combat</a>`



async function rmflag(item){
    await item.unsetFlag('masscombat', 'istactic');
    console.log('masscombat | ', item.name, ' migrated');
}

function delflags(){
    for (let itm in game.items){
        rmflag(itm)
    }
}
