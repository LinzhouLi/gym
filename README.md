1. 修改文件夹`assets/crowd`，更换人物模型和动作。

2. 添加文件夹`assets/shader`，shader代码。
3. `src/avatar/AvatarManager.js`，控制人群NPC的主要逻辑部分。
4. `src/avatar/LODController.js`，视锥剔除与LoD距离计算。
5. `src/avatar/SeatManager.js`，每个NPC的位置。
6. `src/lib/GPUjs`，使用GPU计算LoD会用到，但当前并未使用。
7. `src/lib/instancedLib/InstancedGroup.js`，控制人群实例化对象。
8. `src/lib/instancedLib/SkinnedMeshController.js`，暂未使用。



`src/viewer.js`文件添加480-503行，作为NPC人群加载的接口：

```javascript
async setupScene(playerAssetCallback) {
    this.setCamera();

    this.addVrSpace();

    this.loadPlayerAsset(playerAssetCallback);

    window.content = this.content;

    window.c = this.activeCamera;
    window.s = this.scene;
    //开始生成背景人群
    this.avatarManager = new AvatarManager(
      new SeatManager().positions,
      window.c
    );
    this.scene.add(this.avatarManager.avatar);
    // //开始加载人群资源
    await this.avatarManager.init();
    await this.avatarManager.createLowAvatar(); // 人物低模
    await this.avatarManager.createMediumAvatar(); // 人物中模
    await this.avatarManager.createHighAvatar(); // 人物高模
    //完成生成背景人群
  }
```

