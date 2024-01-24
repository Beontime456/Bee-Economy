// Required dependencies
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Required tables
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);
const skills = require('C:/Bee Economy/models/skills.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();
skills.sync();

// Required functions
const gradeMultipliers = {
    'F': 0.75,
    'E': 0.85,
    'D': 1,
    'C': 1.1,
    'B': 1.3,
    'A': 1.5,
    'S': 1.75,
    'SS': 2,
};
const gradeRarities = {
    'F': 15,
    'E': 45,
    'D': 70,
    'C': 85,
    'B': 95,
    'A': 99,
    'S': 100,
};
async function findCommand(grade, type, ...values) {
    if (type === 'bee') {
        const findableBees = await beelist.findAll({ where: { findType: values[0], beeGrade: grade } });
        return findableBees[Math.floor(Math.random() * findableBees.length)];
    }
    else if (type === 'skill') {
        const findableSkills = await skills.findAll({ where: { skillRarity: grade, skillType: values[0], skillid: { [Sequelize.Op.notIn]: values[1] } } });
        return findableSkills[Math.floor(Math.random() * findableSkills.length)];
    }
}
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!', 'Halictidae bees are all ground-nesting bees with extremely diverse levels of sociality. Some species can even switch between being social or solitary depending on their environment.',
    'The Halictidae family also known as \'Sweet\' bees, because of their small size (4-8mm) these insects comprise some groups which are metallic in appearance.', 'The Stenotritidae bee family is the smallest of the seven bee families with 2 subfamilies and 21 species. The family is only found in Australia and closely related to Colletidae.'];
    const randomFact = Math.floor(Math.random() * 20);
    return beeFacts[randomFact];
}
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('find')
		.setDescription('Find a bee in your current area.'),
	async execute(interaction, isSlash) {
        // Determine if the command was initiated through slash or text
        let interactionAuth = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
        }
        else {
            interactionAuth = interaction.author;
        }
        const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
        try {
            // Check if the player has enough energy and bee slots, then roll a number between 1 and 100 to determine bee rarity.
            if (findplayer.get('energy') - 20 >= 0) {
                const findPlayerBeeSlots = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
                if (findPlayerBeeSlots.get('beeSlots') >= await playerbees.count({ where: { playerid: interactionAuth.id } }) + 1) {
                    let beeFound = undefined;
                    while (beeFound === undefined) {
                        const gradeNumber = Math.floor(Math.random() * 101);
                        if (gradeNumber <= gradeRarities['F']) {
                            beeFound = await findCommand('F', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber > gradeRarities['F'] && gradeNumber <= gradeRarities['E']) {
                            beeFound = await findCommand('E', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber > gradeRarities['E'] && gradeNumber <= gradeRarities['D']) {
                            beeFound = await findCommand('D', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber > gradeRarities['D'] && gradeNumber <= gradeRarities['C']) {
                            beeFound = await findCommand('C', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber > gradeRarities['C'] && gradeNumber <= gradeRarities['B']) {
                            beeFound = await findCommand('B', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber > gradeRarities['B'] && gradeNumber <= gradeRarities['A']) {
                            beeFound = await findCommand('A', 'bee', findplayer.get('area'));
                        }
                        else if (gradeNumber === gradeRarities['S']) {
                            beeFound = await findCommand('S', 'bee', findplayer.get('area'));
                        }
                    }
                    // Create and send an embed displaying which bee was found
                    const findembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${interactionAuth.displayName}'s exploration results (-20 energy)`, iconURL: interactionAuth.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields({ name: `${capitaliseWords((await beeFound).dataValues.beeName)}`, value: `Grade: ${(await beeFound).dataValues.beeGrade}` });
                    await interaction.reply({ embeds: [findembed] });
                    // Determine bee IBI and create the bee
                    const findplayerbees = await playerbees.findAll({ where: { playerid: interactionAuth.id }, order: sequelize.literal('IBI ASC') });
                    let nextIBI = 0;
                    if (findplayerbees.length > 0) {
                        let currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                        while (nextIBI === currentIBI) {
                            nextIBI++;
                            if (findplayerbees[nextIBI] != undefined) {
                                currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                            }
                        }
                    }
                    await playerbees.create({
                        playerid: interactionAuth.id,
                        IBI: nextIBI,
                        beeid: (await beeFound).dataValues.beeid,
                        beeLevel: 1,
                        beeTier: (await beeFound).dataValues.beeBaseTier,
                        tierUpMod: 1,
                        beePower: Math.floor((await beeFound).dataValues.beeBasePower * gradeMultipliers[(await beeFound).dataValues.beeGrade]),
                        beeHealth: 100,
                        skills: '[]',
                    });
                    await findplayer.update({ energy: findplayer.get('energy') - 20 });
                }
                else {
                    await interaction.reply('You don\'t have enough bee slots for another bee! Get some more lmao');
                }
            }
            else {
                await interaction.reply('You don\'t have enough energy to look for another bee! Try resting for a while then try again.');
            }
        }
        catch (error) {
            await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
            console.log(error);
        }
    },
};