import { oxmysql } from "@overextended/oxmysql";
import { getFrameworkID, onClientCallback } from "../utils";
import { SkinDB } from "@typings/appearance";

async function getSkin(src: number, frameworkId: string) {
    if (!frameworkId) {
        frameworkId = getFrameworkID(src);
    }

    const response = await oxmysql.prepare(
        'SELECT skin FROM appearance WHERE id = ?',
        [frameworkId]
    );
    return JSON.parse(response);
}
onClientCallback('bl_appearance:server:getSkin', getSkin);
exports('GetPlayerSkin', function(id) {
    return getSkin(null, id)
});

async function getClothes(src: number, frameworkId: string) {
    if (!frameworkId) {
        frameworkId = getFrameworkID(src);
    }

    const response = await oxmysql.prepare(
        'SELECT clothes FROM appearance WHERE id = ?',
        [frameworkId]
    );
    return JSON.parse(response);
}
onClientCallback('bl_appearance:server:getClothes', getClothes);
exports('GetPlayerClothes', function(id) {
    return getClothes(null, id)
});

async function getTattoos(src: number, frameworkId: string) {
    if (!frameworkId) {
        frameworkId = getFrameworkID(src);
    }

    const response = await oxmysql.prepare(
        'SELECT tattoos FROM appearance WHERE id = ?',
        [frameworkId]
    );
    return JSON.parse(response) || [];
}
onClientCallback('bl_appearance:server:getTattoos', getTattoos);
exports('GetPlayerTattoos', function(id) {
    return getTattoos(null, id)
});

async function getAppearance(src: number, frameworkId: string) {
    if (!frameworkId && !src) return null;
    
    if (!frameworkId) {
        frameworkId = getFrameworkID(src);
    }

//     const response: SkinDB = await oxmysql.single(
//         'SELECT * FROM appearance WHERE id = ? LIMIT 1',
//         [frameworkId]
//     );

//     if (!response) return null;
//     let appearance = {
//         ...JSON.parse(response.skin),
//         ...JSON.parse(response.clothes),
//         tattoos: JSON.parse(response.tattoos),
//     }
//     appearance.id = response.id
//     return appearance;
// }

  const character = await oxmysql.single(
    "SELECT model, hair_texture, hair_color, hair_highlight, hair_style FROM user_characters WHERE id = ? LIMIT 1",
    [frameworkId]
  );

  const features = await oxmysql.single(
    "SELECT name, value, type FROM user_character_features WHERE character_id = ?",
    [frameworkId]
  );

  const tattoos = await oxmysql.oxmysql.prepare(
    "SELECT zone, name, label, collection, hash_male, hash_female, opacity FROM user_character_tattoos WHERE character_id = ?",
    [frameworkId]
  );

  const featuresData = features.reduce((acc, { name, value, type }) => {
    if (!acc[type]) {
      acc[type] = {};
    }
    acc[type][name] = value;
    return acc;
  }, {});

  const components = await oxmysql.prepare(
    "SELECT type, component_id, texture, drawable FROM user_character_components WHERE character_id = ?",
    [frameworkId]
  );

  const componentsData = components.reduce((acc, { component_id, texture, drawable, type }) => {
    if (!acc[type]) {
      acc[type] = {};
    }
    acc[type][component_id] = {
      texture: texture,
      drawable: drawable,
    };
    return acc;
  }, {});

  const overlays = await oxmysql.prepare(
    "SELECT name, style, opacity, second_color, color FROM user_character_overlays WHERE character_id = ?",
    [frameworkId]
  );

  const overlaysData = components.reduce((acc, { name, style, opacity, second_color, color }) => {
    if (!acc[name]) {
      acc[name] = {};
    }
    acc[name] = {
      style: style,
      opacity: opacity,
      secondColor: second_color,
      color: color,
    };
    return acc;
  }, {});

  const faceData = {
    crap: [
      'Nose_Width',
      'Nose_Peak_Height',
      'Nose_Peak_Lenght',
      'Nose_Bone_Height',
      'Nose_Peak_Lowering',
      'Nose_Bone_Twist',
      'EyeBrown_Height',
      'EyeBrown_Forward',
      'Cheeks_Bone_High',
      'Cheeks_Bone_Width',
      'Cheeks_Width',
      'Eyes_Openning',
      'Lips_Thickness',
      'Jaw_Bone_Width',
      'Jaw_Bone_Back_Lenght',
      'Chin_Bone_Lowering',
      'Chin_Bone_Length',
      'Chin_Bone_Width',
      'Chin_Hole',
      'Neck_Thikness',
    ],
    mapper: {
      'Nose_Width': 'noseWidth',
      'Nose_Peak_Height': 'nosePeakHigh',
      'Nose_Peak_Lenght': 'nosePeakLowering',
      'Nose_Bone_Height': 'noseBoneHigh',
      'Nose_Peak_Lowering': 'nosePeakLowering',
      'Nose_Bone_Twist': 'noseBoneTwist',
      'EyeBrown_Height': 'eyeBrownHigh',
      'EyeBrown_Forward': 'eyeBrownForward',
      'Cheeks_Bone_High': 'cheeksBoneHigh',
      'Cheeks_Bone_Width': 'cheeksBoneWidth',
      'Cheeks_Width': 'cheeksWidth',
      'Eyes_Openning': 'eyesOpening',
      'Lips_Thickness': 'lipsThickness',
      'Jaw_Bone_Width': 'jawBoneWidth',
      'Jaw_Bone_Back_Lenght': 'jawBoneBackSize',
      'Chin_Bone_Lowering': 'chinBoneLowering',
      'Chin_Bone_Length': 'chinBoneLenght',
      'Chin_Bone_Width': 'chinBoneWidth',
      'Chin_Hole': 'chinHole',
      'Neck_Thikness': 'neckThickness',
    },
  }

  let headStructure = {};
  for (let i = 0; i < faceData.crap.length; i++) {
    const overlay = faceData.crap[i];
    const map = faceData.mapper[overlay]
    headStructure[overlay] = {
      id: overlay,
      index: i,
      value: featuresData.faceFeatures[map] || 0,
    };
  }

  const skin = {
    headBlend: {
      ...featuresData.headBlend,
      hasParent: true, // TODO
    },
    headStructure: headStructure,
    hairColor: {
      color: character.hair_color,
      highlight: character.hair_highlight,
    },
    model: character.model,
  }

  const drawableData = {
    crap: [
      'face',
      'masks',
      'hair',
      'torsos',
      'legs',
      'bags',
      'shoes',
      'neck',
      'shirts',
      'vest',
      'decals',
      'jackets',
    ],
    mapper: {
      'face': 0,
      'masks': 1,
      'hair': 2,
      'torsos': 3,
      'legs': 4,
      'bags': 5,
      'shoes': 6,
      'neck': 7,
      'shirts': 8,
      'vest': 9,
      'decals': 10,
      'jackets': 11,
    },
  }

  let drawables = {};
  for (let i = 0; i < drawableData.crap.length; i++) {
    const name = drawableData.crap[i];
    const map = faceData.mapper[name]

    drawables[name] = {
      id: name,
      index: i,
      value: componentsData.components[map]?.drawable || 0,
      texture: componentsData.components[map]?.texture || 0,
    };
  }

  const propsData = {
    crap: [
      'hats',
      'glasses',
      'earrings',
      'mouth',
      'lhand',
      'rhand',
      'watches',
      'bracelets',
    ],
    mapper: {
      'hats': 0,
      'glasses': 1,
      'earrings': 2,
      'mouth': 3,
      'lhand': 4,
      'rhand': 5,
      'watches': 6,
      'bracelets': 7,
    },
  }

  let props = {};
  for (let i = 0; i < drawableData.crap.length; i++) {
    const name = drawableData.crap[i];
    const map = faceData.mapper[name]

    props[name] = {
      id: name,
      index: i,
      value: componentsData.props[map]?.drawable || 0,
      texture: componentsData.props[map]?.texture || 0,
    };
  }

  const headOverlayData = {
    crap: [
      'Blemishes',
      'FacialHair',
      'Eyebrows',
      'Ageing',
      'Makeup',
      'Blush',
      'Complexion',
      'SunDamage',
      'Lipstick',
      'MolesFreckles',
      'ChestHair',
      'BodyBlemishes',
      'AddBodyBlemishes',
      'EyeColor',
    ],
    mapper: {
      'Blemishes': 'blemishes',
      'FacialHair': 'beard',
      'Eyebrows': 'eyebrows',
      'Ageing': 'ageing',
      'Makeup': 'makeUp',
      'Blush': 'blush',
      'Complexion': 'complexion',
      'SunDamage': 'sunDamage',
      'Lipstick': 'lipstick',
      'MolesFreckles': 'molesAndFreckles',
      'ChestHair': 'chestHair',
      'BodyBlemishes': 'bodyBlemishes',
      'AddBodyBlemishes': '',
      'EyeColor': 'eyeColor',
    },
  }
    
  let headOverlay = {};
  for (let i = 0; i < headOverlayData.crap.length; i++) {
    const overlay = headOverlayData.crap[i];
    const map = headOverlayData.mapper[overlay] 
    if (overlaysData[map]) {
      const data = overlaysData[map]

      if (map === 'eyeColor') {
        headOverlay[overlay] = {
          index: i,
          overlayValue: data.overlay === 255 ? -1 : data.overlay,
        };
      } else {
        headOverlay[overlay] = {
          index: i,
          overlayValue: data.overlay === 255 ? -1 : data.overlay,
          colourType: data.style,
          firstColor: data.color,
          secondColor: data.secondColor,
          overlayOpacity: 0, // TODO
        };
      }
    }
  }

  const clothes = {
    drawables: drawables,
    props: props,
    headOverlay: headOverlay,
  }

  const isFemale = character.model == 'mp_f_freemode_01'

  let tattooZones = []
  const [TATTOO_LIST, TATTOO_CATEGORIES] = exports.bl_appearance.tattoos()
  for (let i = 0; i < TATTOO_CATEGORIES.length; i++) {
      const category = TATTOO_CATEGORIES[i]
      const zone = category.zone
      const label = category.label
      const index = category.index
      tattooZones[index] = {
          zone: zone,
          label: label,
          zoneIndex: index,
          dlcs: []
      }

      for (let j = 0; j < TATTOO_LIST.length; j++) {
          const dlcData = TATTOO_LIST[j]
          tattooZones[index].dlcs.push({
              label: dlcData.dlc,
              dlcIndex: j,
              tattoos: []
          })
      }
  }

  const tattoosData = tattoos.reduce((acc, { zone, name, label, collection, hash_male, hash_female, opacity }) => {
    if (!acc[zone]) {
      acc[zone] = {};
    }

    acc[zone].collections[collection] = {
      name: name,
      label: label,
      hash_male: hash_male,
      hash_female: hash_female,
      opacity: opacity,
    };

    return acc;
  }, {});

  // for (let i = 0; i < TATTOO_LIST.length; i++) {
  //   if (tattoosData[zone] && tattoosData[zone].collections[collection]) {

  //   }
  
  //   tattoosData[zone].dlcs[i].tattoos.push({
  //     label: label,
  //     hash: hash_female || hash_male,
  //     zone: zone,
  //     dlc: collection,
  //   })
  // }

  return {
    ...skin,
    ...clothes,
    tattoos: tattoosData,
  };
}

onClientCallback('bl_appearance:server:getAppearance', getAppearance);
exports('GetPlayerAppearance', function(id) {
    return getAppearance(null, id)
});
