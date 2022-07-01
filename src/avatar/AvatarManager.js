import * as THREE from "three";
import { GLTFLoader } from "../lib/GLTFLoaderEx";
import { InstancedGroup } from "../lib/instancedLib/InstancedGroup.js";
import { LODController } from "./LODController.js";

class AvatarManager {
  constructor(seats, camera) {
    this.avatar = new THREE.Object3D();

    const positionBias = [0.7, 0.6, 0]; // 微调人物位置
    this.seatPositions = seats.map((x) => vecAdd(x, positionBias));
    this.seats = seats;

    this.camera = camera;
    this.clock = new THREE.Clock();
    this.lodController = new LODController(this.seatPositions, camera);
    this.lodFinished = [false, false, false];
    this.filePath;

    this.manager = {
      params: [],
      config: {
        // 3级LOD
        animationFrameCount: 20,
        male: {
          // 男性模型
          maxCount: [60, 500, 3500], // 每级LOD的instance数量
          textureCount: [5, 9], // 材质贴图数量 [row, col]
          animationCount: 8,
          body: {
            // body
            head: [0.5322, 0.70654296875, 1, 1],
            hand: [0.20703125, 0.41259765625, 0.7275390625, 0.57958984375],
            bottom: [0, 0.6, 0.5322, 1],
          },
        },
        female: {
          maxCount: [60, 500, 3500],
          textureCount: [5, 8],
          animationCount: 8,
          body: {
            // body
            head: [0.5322, 0.70654296875, 1, 1],
            hand: [0.20703125, 0.41259765625, 0.7275390625, 0.57958984375],
            bottom: [0, 0.6, 0.5322, 1],
          },
        },
      },
      instanceGroup: {
        male: new Array(3), // 3级LOD
        female: new Array(3),
      },
      host: {
        audio: null,
        mixer: new Array(7),
        cb: null,
      },
    };

    function vecAdd(a, b) {
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }
  }

  async init() {
    // this.psnr = await this.loadJSON("assets/crowd/PSNR.json"); // 峰值信噪比
    this.initFilePath();
    this.initAvatarParams();
    // this.adjustParam();
    // this.computeDisp();
  }

  initFilePath() {
    this.filePath = {
      shader: {
        highVertexShader: "assets/shader/highVertexShader.vert",
        highFragmentShader: "assets/shader/highFragmentShader.frag",
        mediumVertexShader: "assets/shader/mediumVertexShader.vert",
        mediumFragmentShader: "assets/shader/mediumFragmentShader.frag",
        lowVertexShader: "assets/shader/lowVertexShader.vert",
        lowFragmentShader: "assets/shader/lowFragmentShader.frag",
      },

      male: {
        highModelPath: "assets/crowd/model/male_high_merged.glb",
        highAnimationPath: "assets/crowd/animation/male_high_animations_merged.json",
        highTexturePath: "assets/crowd/texture/maleTextureHigh.webp",

        mediumModelPath: "assets/crowd/model/male_medium_merged.glb",
        mediumAnimationPath: "assets/crowd/animation/male_medium_animations_merged.json",
        mediumTexturePath: "assets/crowd/texture/maleTextureMedium.webp",

        lowModelPath: "assets/crowd/model/male_low.glb",
        lowTexturePath: "assets/crowd/texture/maleTextureLow.webp",
      },

      female: {
        highModelPath: "assets/crowd/model/female_high_merged.glb",
        highAnimationPath: "assets/crowd/animation/female_high_animations_merged.json",
        highTexturePath: "assets/crowd/texture/femaleTextureHigh.webp",

        mediumModelPath: "assets/crowd/model/female_medium_merged.glb",
        mediumAnimationPath: "assets/crowd/animation/female_medium_animations_merged.json",
        mediumTexturePath: "assets/crowd/texture/femaleTextureMedium.webp",

        lowModelPath: "assets/crowd/model/female_low.glb",
        lowTexturePath: "assets/crowd/texture/femaleTextureLow.webp",
      },
    };
  }

  initAvatarParams() {

    const maleTexCount = this.manager.config.male.textureCount[0] * this.manager.config.male.textureCount[1];
    const femaleTexCount = this.manager.config.female.textureCount[0] * this.manager.config.female.textureCount[1];
    
    for (let i = 0; i < this.seatPositions.length; i++) {

      let param = {
        position: this.seatPositions[i],
        rotation: this.seats[i].slice(3, 9),
        scale: [1, 1, 1],
        animationSpeed: 10,
        LOD: -1,
        textureType: [0, 0, 0, 0],
        animationType: 0,
        animationStartTime: 0,
        animationEndTime: 0,
        bodyScale: [
          1,
          0.9 + 0.2 * Math.random(),
          0.9 + 0.2 * Math.random(),
          0.9 + 0.2 * Math.random(),
        ],
      };

      if (Math.random() < 0.5) {
        // 以0.5的概率生成男性
        param.animationType = Math.floor(
          Math.random() * this.manager.config.male.animationCount
        );
        param.textureType = [
          Math.floor(Math.random() * maleTexCount),
          Math.floor(Math.random() * maleTexCount),
          Math.floor(Math.random() * maleTexCount),
          Math.floor(Math.random() * maleTexCount),
        ];
        param.sex = "male";
      } 
      
      else {
        // 以0.5的概率生成女性
        param.animationType = Math.floor(
          Math.random() * this.manager.config.female.animationCount
        );
        param.textureType = [
          Math.floor(Math.random() * femaleTexCount),
          Math.floor(Math.random() * femaleTexCount),
          Math.floor(Math.random() * femaleTexCount),
          Math.floor(Math.random() * femaleTexCount),
        ];
        param.sex = "female";
      }
      this.manager.params.push(param);

    }

  }

  adjustParam() {
    for (let i = 0; i < this.manager.params.length; i++) {
      let param = this.manager.params[i];
      if (param.sex == "male") {
        if (
          param.textureType[0] == 6 ||
          param.textureType[0] == 11 ||
          param.textureType[0] == 13
        )
          param.textureType[0]--; // 去掉短袖短裤
        if (param.textureType[2] == 13) param.textureType[2]--;
      } else if (param.sex == "female") {
        if (param.textureType[0] == 14) param.textureType[0]--; // 去掉短袖短裤
        if (param.textureType[2] == 3 || param.textureType[2] == 7)
          param.textureType[2]--;
        if (param.textureType[2] == 4 || param.textureType[2] == 8)
          param.textureType[2]++;
      }
    }
  }

  setWaveAnimation(param, time) {
    if (time > param.animationEndTime) {
      let delta = (17 + Math.random() * 22) / param.animationSpeed;
      delta /= 5;
      let Fun = (t, x, y) => {
        let freqency = 0.2,//频率
          intension = 10,//波浪边缘模糊程度
          WaveCount = 6;//同时几个波峰
        return intension * Math.sin(2 * Math.PI * t * freqency + WaveCount*Math.atan2(y, x)) + 0.5;
      }; //状态函数
      let status = Fun(time, param.position[0], param.position[2]);
        if (Math.random() > status)//坐下
          param.animationType = Math.floor(Math.random() * 5) + 1;
        else//站起
          param.animationType = Math.floor(Math.random() * 3) + 6;
      param.animationStartTime = time;
      param.animationEndTime = time + Math.floor(delta);
    }
  }

  setAvatarAnimation(param, time) {
    if (time > param.animationEndTime) {
      let delta;
      if (Math.random() < 0.1) { // 0.2的概率静止
        param.animationType = 0;
        delta = (3 + Math.random() * 67) / param.animationSpeed;
      } else {
        param.animationType = Math.floor( Math.random() * this.manager.config[param.sex].animationCount ) + 1;
        delta = (17 + Math.random() * 22) / param.animationSpeed;
      }
      param.animationStartTime = time;
      param.animationEndTime = time + Math.floor(delta);
    }
  }

  initAvatarParamsGreedly() {
    const maleTexCount = this.manager.config.male.textureCount[0] * this.manager.config.male.textureCount[1];
    const femaleTexCount = this.manager.config.female.textureCount[0] * this.manager.config.female.textureCount[1];
    const rowNum = [24, 34, 28], col = 26;

    for (let l = 0; l < rowNum.length; l++) {
      const row = rowNum[l];
      for (let k = 0; k < 3; k++) {
        let bais = k * row * col;
        for (let p = 0; p < l; p++) {
          bais += rowNum[p] * col * 3;
        }
        let genId = (x, y) => {
          return bais + x * col + y;
        };
        for (let i = 0; i < row; i++) {
          for (let j = 0; j < col; j++) {
            const id = genId(i, j);
            let islegal = (x, y) => {
              if (x < 26 && x >= 0 && y < row && y >= 0) return true;
              else return false;
            };
            let param = {
              position: this.seatPositions[id],
              scale: [2.6, 2.6, 2.6],
              animationSpeed: 10,
              LOD: -1,
              textureType: [0, 0, 0, 0],
              animationType: 0,
              animationStartTime: 0,
              animationEndTime: 0,
              bodyScale: [
                1,
                0.9 + 0.2 * Math.random(),
                0.9 + 0.2 * Math.random(),
                0.9 + 0.2 * Math.random(),
              ],
            };
            let candidate = [];
            if (islegal(i - 1, j)) candidate.push(genId(i - 1, j));
            if (islegal(i - 1, j - 1)) candidate.push(genId(i - 1, j - 1));
            if (islegal(i - 1, j + 1)) candidate.push(genId(i - 1, j + 1));
            if (islegal(i, j - 1)) candidate.push(genId(i, j - 1));
            let comp = (a, b) => {
              let x = a,
                y = b;
              let suma = 0,
                sumb = 0;
              for (let t = 0; t < candidate.length; t++) {
                const element = candidate[t];
                let temp = this.manager.params[element];
                suma += this.computePSNR(temp, x);
                sumb += this.computePSNR(temp, y);
              }
              if (suma < sumb) return 1;
              if (suma > sumb) return -1;
              return 0;
            };
            if (Math.random() < 0.5) {
              // 以0.5的概率生成男性
              param.animationType = Math.floor( Math.random() * this.manager.config.male.animationCount );
              param.textureType = [
                Math.floor( Math.random() * maleTexCount ),
                Math.floor( Math.random() * maleTexCount ),
                Math.floor( Math.random() * maleTexCount ),
                Math.floor( Math.random() * maleTexCount ),
              ];
              param.sex = "male";
              if (candidate.length > 0) {
                let toSort = [];
                for (
                  let index = 0;
                  index < maleTexCount;
                  index++
                ) {
                  let tmp = { position: [], textureType: [0, 0, 0, 0] };
                  tmp.position = param.position;
                  tmp.textureType[0] = index;
                  toSort.push(tmp);
                }
                toSort.sort(comp);
                param.textureType[0] =
                  toSort[Math.floor(Math.random() * 3)].textureType[0];
              }
            } else {
              // 以0.5的概率生成女性
              param.animationType = Math.floor(
                Math.random() * this.manager.config.female.animationCount
              );
              param.textureType = [
                Math.floor(
                  Math.random() * this.manager.config.female.textureCount
                ),
                Math.floor(
                  Math.random() * this.manager.config.female.textureCount
                ),
                Math.floor(
                  Math.random() * this.manager.config.female.textureCount
                ),
                Math.floor(
                  Math.random() * this.manager.config.female.textureCount
                ),
              ];
              param.sex = "female";
              if (candidate.length) {
                let toSort = [];
                for (
                  let index = 0;
                  index < femaleTexCount;
                  index++
                ) {
                  let tmp = { position: [], textureType: [0, 0, 0, 0] };
                  tmp.position = param.position;
                  tmp.textureType[0] = index;
                  toSort.push(tmp);
                }
                toSort.sort(comp);
                param.textureType[0] =
                  toSort[Math.floor(Math.random() * 3)].textureType[0];
              }
            }
            this.manager.params.push(param);
          }
        }
      }
    }
  }

  computeDisp() {
    // 峰值信噪比差异
    let texSum = 0;
    for (let i = 0; i < this.seatPositions.length; i++) {
      for (let j = i + 1; j < this.seatPositions.length; j++) {
        texSum += this.computePSNR(
          this.manager.params[i],
          this.manager.params[j]
        );
      }
    }
    console.log("diff_texture: ", texSum);

    // 局部差异
    let localSum = 0;
    for (let i = 0; i < this.seatPositions.length; i++) {
      for (let j = i + 1; j < this.seatPositions.length; j++) {
        localSum += this.computeLocal(
          this.manager.params[i],
          this.manager.params[j]
        );
      }
    }
    console.log("diff_local: ", localSum);
  }

  computePSNR(ava1, ava2) {
    const maleTexCount = this.manager.config.male.textureCount[0] * this.manager.config.male.textureCount[1];
    const femaleTexCount = this.manager.config.female.textureCount[0] * this.manager.config.female.textureCount[1];

    let diff = 0, id1, id2;
    if (ava1.sex == "male") id1 = ava1.textureType[0];
    else id1 = ava1.textureType[0] + maleTexCount;
    if (ava2.sex == "male") id2 = ava2.textureType[0];
    else id2 = ava2.textureType[0] + femaleTexCount;
    diff = this.psnr[id1][id2];
    // 两人物距离
    let vec = [
      ava1.position[0] - ava2.position[0],
      ava1.position[1] - ava2.position[1],
      ava1.position[2] - ava2.position[2],
    ];
    return (
      (2 * diff) /
      (Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]) *
        (this.seatPositions.length - 1) *
        this.seatPositions.length)
    );
  }

  computeLocal(ava1, ava2) {
    let diff = 0;
    for (let k = 1; k < 4; k++) {
      //三个部位
      diff += Math.abs(ava1.bodyScale[k] - ava2.bodyScale[k]);
    }
    let vec = [
      ava1.position[0] - ava2.position[0],
      ava1.position[1] - ava2.position[1],
      ava1.position[2] - ava2.position[2],
    ];
    return (
      (2 * diff) /
      (Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]) *
        (this.seatPositions.length - 1) *
        this.seatPositions.length)
    );
  }

  updateLOD() {
    if (!this.lodFinished[2]) return;

    const minFinishedLOD = this.lodFinished[1]
      ? this.lodFinished[0]
        ? 0
        : 1
      : 2;
    const lod = this.lodController.update();
    let lodCount = {
      male: [0, 0, 0],
      female: [0, 0, 0],
    };
    let time = this.clock.getElapsedTime();
    for (let i = 0; i < lod.length; i++) {
      if (lod[i] != -1) {
        let param = this.manager.params[i];
        this.setAvatarAnimation(param, time); // 原人物动作控制
        // this.setWaveAnimation(param, time); // 人浪
        param.LOD = Math.max(lod[i], minFinishedLOD);
        param.index = lodCount[param.sex][param.LOD]++;
        this.setInstanceParam(param);
      }
    }

    this.manager.instanceGroup.male.forEach((group, i) => {
      if (lodCount.male[i] > this.manager.config.male.maxCount[i])
        console.warn(`Male LOD:${i}的instance数量设置不足!`); // instances个数不足
      group.mesh.count = lodCount.male[i];
      group.update();
    });
    this.manager.instanceGroup.female.forEach((group, i) => {
      if (lodCount.female[i] > this.manager.config.female.maxCount[i])
        console.warn(`Female LOD:${i}的instance数量设置不足!`); // instances个数不足
      group.mesh.count = lodCount.female[i];
      group.update();
    });

    return [
      lodCount.male[0] + lodCount.female[0],
      lodCount.male[1] + lodCount.female[1],
      lodCount.male[2] + lodCount.female[2],
    ];
  }

  setInstanceParam(param) {
    if (param.LOD == -1) return; // LOD为-1表示在视锥外

    // 人物旋转参数设置
    let rotation = param.rotation.slice(0, 3);
    if (param.LOD == 2) rotation = param.rotation.slice(3, 6);

    const instanceGroup = this.manager.instanceGroup[param.sex][param.LOD];
    instanceGroup.setAnimation(
      param.index,
      param.animationType,
      param.animationStartTime
    );
    instanceGroup.setSpeed(param.index, param.animationSpeed);
    instanceGroup.setTexture(param.index, param.textureType);
    instanceGroup.setRotation(param.index, rotation); // 使Avatar面向前方
    instanceGroup.setPosition(param.index, param.position);
    instanceGroup.setScale(param.index, param.scale);
    instanceGroup.setBodyScale(param.index, param.bodyScale);
  }

  async createLowAvatar() {
    // male
    const maleModel = await this.loadGLB(this.filePath.male.lowModelPath);
    const maleMesh = maleModel.scene.children[0];

    const maleInstanceGroup = new InstancedGroup(
      this.manager.config.male.maxCount[2],
      maleMesh,
      false,
      false,
      this.filePath.male.lowTexturePath,
      false,
      this.manager.config.male.textureCount,
      this.camera,
      this.clock
    );
    maleInstanceGroup.vertURL = this.filePath.shader.lowVertexShader;
    maleInstanceGroup.fragURL = this.filePath.shader.lowFragmentShader;

    const maleInstanceMesh = await maleInstanceGroup.init();
    this.manager.instanceGroup.male[2] = maleInstanceGroup;
    this.avatar.add(maleInstanceMesh);

    // female
    const femaleModel = await this.loadGLB(this.filePath.female.lowModelPath);
    const femaleMesh = femaleModel.scene.children[0];

    const femaleInstanceGroup = new InstancedGroup(
      this.manager.config.female.maxCount[2],
      femaleMesh,
      false,
      false,
      this.filePath.female.lowTexturePath,
      false,
      this.manager.config.female.textureCount,
      this.camera,
      this.clock
    );
    femaleInstanceGroup.vertURL = this.filePath.shader.lowVertexShader;
    femaleInstanceGroup.fragURL = this.filePath.shader.lowFragmentShader;

    const femaleInstanceMesh = await femaleInstanceGroup.init();
    this.manager.instanceGroup.female[2] = femaleInstanceGroup;
    this.avatar.add(femaleInstanceMesh);

    this.lodFinished[2] = true;
  }

  async createMediumAvatar() {
    // male
    const maleModel = await this.loadGLB(this.filePath.male.mediumModelPath);
    // const maleMesh = maleModel.scene.children[0].children[0].children[2];
    const maleMesh = maleModel.scene.children[0].children[0].children[1];

    const maleInstanceGroup = new InstancedGroup(
      this.manager.config.male.maxCount[1],
      maleMesh,
      this.filePath.male.mediumAnimationPath,
      null,
      this.filePath.male.mediumTexturePath,
      this.filePath.male.lightMapPath,
      this.manager.config.male.textureCount,
      this.camera,
      this.clock
    );
    maleInstanceGroup.body = this.manager.config.male.body;
    maleInstanceGroup.vertURL = this.filePath.shader.mediumVertexShader;
    maleInstanceGroup.fragURL = this.filePath.shader.mediumFragmentShader;

    const maleInstanceMesh = await maleInstanceGroup.init();
    this.manager.instanceGroup.male[1] = maleInstanceGroup;
    this.avatar.add(maleInstanceMesh);

    // female
    const femaleModel = await this.loadGLB(
      this.filePath.female.mediumModelPath
    );
    // const femaleMesh = femaleModel.scene.children[0].children[0].children[2];
    const femaleMesh =
      femaleModel.scene.children[0].children[0].children[1].children[0];

    const femaleInstanceGroup = new InstancedGroup(
      this.manager.config.female.maxCount[1],
      femaleMesh,
      this.filePath.female.mediumAnimationPath,
      null,
      this.filePath.female.mediumTexturePath,
      this.filePath.female.lightMapPath,
      this.manager.config.female.textureCount,
      this.camera,
      this.clock
    );
    femaleInstanceGroup.body = this.manager.config.female.body;
    femaleInstanceGroup.vertURL = this.filePath.shader.mediumVertexShader;
    femaleInstanceGroup.fragURL = this.filePath.shader.mediumFragmentShader;

    const femaleInstanceMesh = await femaleInstanceGroup.init();
    this.manager.instanceGroup.female[1] = femaleInstanceGroup;
    this.avatar.add(femaleInstanceMesh);

    this.lodFinished[1] = true;
  }

  async createHighAvatar() {
    // male
    const maleModel = await this.loadGLB(this.filePath.male.highModelPath);
    const maleMesh = maleModel.scene.children[0].children[0].children[1];

    const maleInstanceGroup = new InstancedGroup(
      this.manager.config.male.maxCount[0],
      maleMesh,
      this.filePath.male.highAnimationPath,
      false,
      this.filePath.male.highTexturePath,
      this.filePath.male.lightMapPath,
      this.manager.config.male.textureCount,
      this.camera,
      this.clock
    );
    maleInstanceGroup.body = this.manager.config.male.body;
    maleInstanceGroup.vertURL = this.filePath.shader.highVertexShader;
    maleInstanceGroup.fragURL = this.filePath.shader.highFragmentShader;

    const maleInstanceMesh = await maleInstanceGroup.init();
    this.manager.instanceGroup.male[0] = maleInstanceGroup;
    this.avatar.add(maleInstanceMesh);

    // female
    const femaleModel = await this.loadGLB(this.filePath.female.highModelPath);
    // const femaleMesh = femaleModel.scene.children[0].children[0].children[2];
    const femaleMesh =
      femaleModel.scene.children[0].children[0].children[2].children[0];

    const femaleInstanceGroup = new InstancedGroup(
      this.manager.config.female.maxCount[0],
      femaleMesh,
      this.filePath.female.highAnimationPath,
      false,
      this.filePath.female.highTexturePath,
      this.filePath.female.lightMapPath,
      this.manager.config.female.textureCount,
      this.camera,
      this.clock
    );
    femaleInstanceGroup.body = this.manager.config.female.body;
    femaleInstanceGroup.vertURL = this.filePath.shader.highVertexShader;
    femaleInstanceGroup.fragURL = this.filePath.shader.highFragmentShader;

    const femaleInstanceMesh = await femaleInstanceGroup.init();
    this.manager.instanceGroup.female[0] = femaleInstanceGroup;
    this.avatar.add(femaleInstanceMesh);

    this.lodFinished[0] = true;
  }

  loadJSON(path) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.FileLoader();
      loader.load(path, (data) => {
        const json = JSON.parse(data);
        resolve(json);
      });
    });
  }

  loadGLB(path) {
    return new Promise((resolve, reject) => {
      const modelLoader = new GLTFLoader();
      modelLoader.load(path, (gltf) => {
        resolve(gltf);
      });
    });
  }

  loadAudio(path) {
    return new Promise((resolve, reject) => {
      new THREE.AudioLoader().load(path, (buffer) => {
        resolve(buffer);
      });
    });
  }
}

export { AvatarManager };
