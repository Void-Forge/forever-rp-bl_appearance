import { oxmysql } from "@overextended/oxmysql";
import { config, core, getFrameworkID, getPlayerData, onClientCallback } from "../utils";
import { Outfit } from "@typings/outfits";

async function getOutfits(src: number, frameworkId: string) {
    // const job = core.GetPlayer(src).job || { name: 'unknown', grade: { name: 'unknown' } }

    try {
        let response = await oxmysql.prepare('SELECT * FROM user_character_outfits WHERE character_id = ?', [frameworkId]);

        if (!response || response.length === 0) {
            return [];
        }

        if (!Array.isArray(response)) response = [response];

        const outfits = response.map(
            (outfit: { id: number; name: string; appearance: string;}) => {
                return {
                    id: outfit.id,
                    label: outfit.name,
                    outfit: JSON.parse(outfit.appearance),
                    jobname: null,
                };
            }
        );

        return outfits;

    } catch (error) {
        console.error('An error occurred while fetching outfits:', error);
        // Handle the error, e.g., return a default value or rethrow the error
        return [];
    }
}
onClientCallback('bl_appearance:server:getOutfits', getOutfits);
exports('GetOutfits', getOutfits);

async function renameOutfit(src: number, data: { id: number; label: string }) {
    const frameworkId = getFrameworkID(src);
    const result = await oxmysql.update(
        'UPDATE user_character_outfits SET name = ? WHERE character_id = ? AND id = ?',
        [data.label, frameworkId, data.id]
    );
    return result;
}
onClientCallback('bl_appearance:server:renameOutfit', renameOutfit);
exports('RenameOutfit', renameOutfit);

async function deleteOutfit(src: number, id: number) {
    const frameworkId = getFrameworkID(src);
    const result = await oxmysql.update(
        'DELETE FROM user_character_outfits WHERE character_id = ? AND id = ?',
        [frameworkId, id]
    );
    return result > 0;
}
onClientCallback('bl_appearance:server:deleteOutfit', deleteOutfit);
exports('DeleteOutfit', deleteOutfit);

async function saveOutfit(src: number, data: Outfit) {
    const frameworkId = getFrameworkID(src);
    let jobname = null;
    let jobrank = 0;
    if (data.job) {
        jobname = data.job.name;
        jobrank = data.job.rank;
    }
    const id = await oxmysql.insert(
        'INSERT INTO user_character_outfits (character_id, name, appearance) VALUES (?, ?, ?)',
        [frameworkId, data.label, JSON.stringify(data.outfit)]
    );
    return id;
}
onClientCallback('bl_appearance:server:saveOutfit', saveOutfit);
exports('SaveOutfit', saveOutfit);


async function fetchOutfit(_: number, id: number) {
    const response = await oxmysql.prepare(
        'SELECT appearance FROM user_character_outfits WHERE id = ? LIMIT 1',
        [id]
    );
    console.log('Pauls a cunt', response);
    return JSON.parse(response[0]);
}
onClientCallback('bl_appearance:server:fetchOutfit', fetchOutfit);
exports('FetchOutfit', fetchOutfit);

async function importOutfit(_: number, frameworkId: string, outfitId: number, outfitName: string) {
    const result = await oxmysql.query(
        'SELECT name, appearance FROM user_character_outfits WHERE id = ?',
        [outfitId]
    );

    if (!result || typeof result !== 'object' || Object.keys(result).length === 0) {
        return { success: false, message: 'Outfit not found' };
    }

    const outfit = result[0].appearance;

    const newId = await oxmysql.insert(
        'INSERT INTO user_character_outfits (character_id, name, appearance) VALUES (?, ?, ?)',
        [frameworkId, outfitName, outfit]
    );

    return { success: true, id: newId, outfit: JSON.parse(outfit), label: outfitName };
}
onClientCallback('bl_appearance:server:importOutfit', importOutfit);
exports('ImportOutfit', importOutfit);

const outfitItem = config.outfitItem

if (!outfitItem) {
    console.warn('bl_appearance: No outfit item configured, please set it in config.lua')
}

onClientCallback('bl_appearance:server:itemOutfit', async (src, data) => {
    const player = core.GetPlayer(src)
    player.addItem(outfitItem, 1, data)
});

core.RegisterUsableItem(outfitItem, async (source: number, slot: number, metadata: { outfit: Outfit, label: string }) => {
    const player = getPlayerData(source)
    if (player?.removeItem(outfitItem, 1, slot))
        emitNet('bl_appearance:client:useOutfitItem', source, metadata.outfit)
})