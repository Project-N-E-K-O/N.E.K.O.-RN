// Live2D 模型配置
export const LIVE2D_MODELS = {
  mao_pro: {
    id: 'mao_pro',
    name: 'NEKO猫咪',
    description: '可爱的猫咪角色，N.E.K.O.的专属live2d模型',
    icon: 'pawprint.circle.fill',
    // 在React Native中，我们需要使用本地资源的路径
    modelPath: './mao_pro/mao_pro.model3.json',
    modelUrl: './mao_pro/mao_pro.model3.json', // Live2DWebView 需要的URL
    thumbnail: require('./mao_pro_thumb.png'),
    animations: [
      {
        name: 'idle',
        displayName: '待机',
        file: 'motions/mtn_01.motion3.json'
      },
      {
        name: 'happy',
        displayName: '开心',
        file: 'motions/mtn_02.motion3.json'
      },
      {
        name: 'neutral',
        displayName: '平静',
        file: 'motions/mtn_04.motion3.json'
      },
      {
        name: 'surprised',
        displayName: '惊讶',
        file: 'motions/special_01.motion3.json'
      },
      {
        name: 'sad',
        displayName: '伤心',
        file: 'motions/special_02.motion3.json'
      }
    ],
    expressions: [
      {
        name: 'exp_01',
        displayName: '表情1',
        file: 'expressions/exp_01.exp3.json'
      },
      {
        name: 'exp_02',
        displayName: '表情2',
        file: 'expressions/exp_02.exp3.json'
      },
      {
        name: 'exp_03',
        displayName: '表情3',
        file: 'expressions/exp_03.exp3.json'
      },
      {
        name: 'exp_04',
        displayName: '表情4',
        file: 'expressions/exp_04.exp3.json'
      },
      {
        name: 'exp_05',
        displayName: '表情5',
        file: 'expressions/exp_05.exp3.json'
      }
    ],
    settings: {
      scale: 1.0,
      positionX: 0,
      positionY: 0,
      autoEyeBlink: true,
      autoBreathing: true
    }
  }
};

export const AVAILABLE_MODELS = Object.values(LIVE2D_MODELS);

export default LIVE2D_MODELS;
