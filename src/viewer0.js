import {
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Mesh,
  Color,
  LoadingManager,
  FloatType,
  PMREMGenerator,
  AnimationMixer,
  PlaneGeometry,
  DoubleSide
} from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import { GLTFLoader } from './lib/GLTFLoaderEx';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { MMONetwork } from './network/MMONetwork';

import { MMOPlayer } from './network/MMOPlayer';

import { GUI } from 'dat.gui';
import { Vector4 } from 'three';
import { Clock } from 'three';

import { VrSpace } from './vrSpace';

import { PMLoaderEx } from './lib/PMLoaderEx';

export class Viewer 
{
  constructor (el, options) 
  {
    this.el = el;
    this.options = options;

    this.lights = [];
    this.content = null;

    this.gui = null;

    this.prevTime = 0;

    this.stats = new Stats();
    this.stats.dom.height = '48px';
    [].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));

    this.scene = new Scene();

    const fov = 60;
    this.defaultCamera = new PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.1, 700);
    this.activeCamera = this.defaultCamera;
    this.scene.add(this.defaultCamera);
    this.activeCamera.layers.enableAll();

    this.renderer = window.renderer = new WebGLRenderer({antialias: true});
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setClearColor(0x1177d6);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.autoClear = false;

    //this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
    //this.controls.autoRotate = false;
    //this.controls.autoRotateSpeed = -10;
    //this.controls.screenSpacePanning = true;

    this.el.appendChild(this.renderer.domElement);

    this.showgui = true;

    this.clock = new Clock();

    this.vrSpace = new VrSpace(this.scene, this.renderer);

    if (this.showgui)
    {
      this.addGUI();
    }

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener('resize', this.resize.bind(this), false);

    {
      var parseUrlParams = function()
      {
        var urlParams = window.location.href;
        var vars = {};
        var parts = urlParams.replace(/[?&]+([^=&]+)=([^&]*)/gi,
          function (m, key, value) {
            vars[key] = decodeURIComponent(value);
          });
          
        return vars;
      }
      var paramJson = parseUrlParams();
    }
    
    this.playerNameBase64 = window.btoa(encodeURIComponent((this.options && this.options.playerName) ? this.options.playerName: 'aa'));

    this.vrSpaceId = paramJson.space ? paramJson.space : '0';
    this.vrRoomId = paramJson.room ? paramJson.room : '100';
    this.vrCharId =  paramJson.char ? paramJson.char : (paramJson.gender ? paramJson.gender: 1);

    this.playerAssetUrls = [
      // {
      //   url: 'assets/players/char31/Char31.glb',
      //   animationClips: 
      //   {
      //     0: ['Animation-10'],
      //     1: ['Animation-50'],
      //     2: ['Animation-30'],
      //     3: ['Animation-40'],
      //     4: ['Animation-00'],
      //   },
      // },
      {
        url: 'assets/players/char31_pm/gltf/scene.gltf',
        animationClips: 
        {
          0: ['Animation-10'],
          1: ['Animation-50'],
          2: ['Animation-30'],
          3: ['Animation-40'],
          4: ['Animation-00'],
        },
        lodUrl: 'assets/players/char31_pm',
        staticUrl: 'assets/players/char31_pm/static/Char31.glb',
      },
      ];

    this.playerAssets = null;

    var _self = this;

    this.setupScene(function(playerAssets)
    {
      console.log(playerAssets);

      if (playerAssets)
      {
        _self.playerAssets = playerAssets;

        console.log(playerAssets);

        _self.SetupNetwork();
      }
    });

    /**************************************************************/

    this.playerMovement = new Vector4(0.0, 0.0, 0.0, 0.0);
      
    this.mmoNetwork = new MMONetwork();

    this.mainPlayer = null;

    this.players = [];
    this.SetupNetwork = function()
    {
      this.mmoNetwork.Setup(this.playerNameBase64, '111111', this.vrSpaceId + '-' + this.vrRoomId, {avatar: this.vrCharId}, result =>{

        console.log(_self.playerAssets);

        _self.mainPlayer = new MMOPlayer(this.mmoNetwork, "player", _self.playerAssets, function(playerRenderableObject)
        {
          _self.scene.add(playerRenderableObject);
        }, null, 
        {
          camera: _self.activeCamera,
          renderer: _self.renderer,
        });

        for (var i = 0; i < 300; ++i)
        {
          var npcPlayer = new MMOPlayer(this.mmoNetwork, "npc", _self.playerAssets, function(playerRenderableObject)
          {
            _self.scene.add(playerRenderableObject);
          }, null, 
          {
            camera: null,
            renderer: _self.renderer,
          });

          this.players.push(npcPlayer);
        }
      });
    }

    this.onKeyDown = function (event)
    {
      //console.log('keycode: ' + event.keyCode);

      if (event.keyCode == 87) // W
      {
        _self.playerMovement.x = 1.0;
      }
      if (event.keyCode == 83) // S
      {
        _self.playerMovement.y = 1.0;
      }
      if (event.keyCode == 65) // A
      {
        _self.playerMovement.z = 1.0;
      }
      if (event.keyCode == 68) // D
      {
        _self.playerMovement.w = 1.0;
      }

      if (event.keyCode == 32)
      {
        if (!_self.spawnPoints)
        {
          _self.spawnPoints = [];
        }

        _self.spawnPoints.push(new Vector3().copy(_self.mainPlayer.GetRenderableObject().position));

        console.log(JSON.stringify(_self.spawnPoints));
      }
    }

    this.onKeyUp = function (event)
    {
      if (event.keyCode == 87) // W
      {
        _self.playerMovement.x = 0.0;
      }
      if (event.keyCode == 83) // S
      {
        _self.playerMovement.y = 0.0;
      }
      if (event.keyCode == 65) // A
      {
        _self.playerMovement.z = 0.0;
      }
      if (event.keyCode == 68) // D
      {
        _self.playerMovement.w = 0.0;
      }
    }

    this.onMouseMove = function(event)
    {
      
    }

    window.addEventListener('keydown', this.onKeyDown, false);
    window.addEventListener('keyup', this.onKeyUp, false);
    window.addEventListener('click', this.onMouseMove, true);
  }

  animate(time)
  {
    requestAnimationFrame(this.animate);

    //this.controls.update();
    this.stats.update();

    this.render();
    
    var delta = this.clock.getDelta();

    if (this.mainPlayer)
    {
      this.mainPlayer.UpdateMovement(delta, this.playerMovement, this.vrSpace.collider);
    }

    for (var i = 0; i < this.players.length; ++i)
    {
      this.players[i].UpdateMovement(delta, new Vector4(), null);
    }

    this.prevTime = time;
  }

  render() 
  {
    this.renderer.clear();
    
    this.renderer.render(this.scene, this.activeCamera);
  }

  resize() 
  {
    const {clientHeight, clientWidth} = this.el.parentElement;

    this.defaultCamera.aspect = clientWidth / clientHeight;
    this.defaultCamera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  loadPlayerAsset(playerAssetCallback)
  {
    function loadAssets(assetUrl, animationClips, lodUrl, staticUrl, callback)
    {
      var loadingManager = new LoadingManager();
      loadingManager.setURLModifier('');

      const loader = new GLTFLoader(loadingManager);
      loader.setCrossOrigin('anonymous');
      
      loader.load(assetUrl, (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];

        gltf.animations.clipNames = animationClips;

        console.log(gltf.animations);

        var mtlMap = {};

        scene.traverse (function(node)
        {
          if (node.material)
          {
            node.material.metalness = 0.0;
            //node.material.roughness = 0.5;

            if (node.material.name.indexOf('hair') >= 0)
            {
              var mtl = new MeshStandardMaterial();
              mtl.map = node.material.map;
              mtl.alphaTest = 0.5;
              mtl.side = DoubleSide;
              node.material = mtl;
              node.material.roughness = 0.6;
            }

            node.material.envMapIntensity = 5.0;

            if (!mtlMap[node.material.name])
            {
              mtlMap[node.material.name] = node.material;
            }
          }
        })

        console.log(mtlMap);

        if (lodUrl)
        {
          var pmLoader = new PMLoaderEx();
  
          //var _self = this;
          pmLoader.load(lodUrl, function (pmModel)
          {
            pmModel.scene.traverse (function(node)
            {
              if (node.material)
              {
                node.material.metalness = 0.0;
                //node.material.roughness = 0.5;
                if (node.material.name.indexOf('1-1') >= 0)
                {
                  var mtl = new MeshStandardMaterial();
                  mtl.map = node.material.map;
                  mtl.alphaTest = 0.5;
                  mtl.side = DoubleSide;
                  mtl.emissive = new Color(0x000000);
                  mtl.color = new Color(0x111111);

                  node.material = mtl;
                  node.material.roughness = 0.6;
                }

                node.material.envMapIntensity = 0.0;
              }
            })

            if (staticUrl)
            {
              const loader = new GLTFLoader(loadingManager);
              loader.setCrossOrigin('anonymous');
              
              loader.load(staticUrl, (gltfStatic) => 
              {
                gltfStatic.scene.traverse (function(node)
                {
                  if (node.material)
                  {
                    node.material.metalness = 0.0;
                    node.material.envMapIntensity = 4.5;
                  }
                })

                if (callback)
                {
                  callback({raw: gltf, lod: pmModel, static: gltfStatic});
                }
              });
            }
            else
            {
              if (callback)
              {
                callback({raw: gltf, lod: pmModel});
              }
            }
          }, null, null, gltf);
        }
        else
        {
          if (callback)
          {
            callback({raw: gltf});
          }
        }
      }, 
      null, null);
    }
    
    var pList = [];
    for (var i = 0; i < this.playerAssetUrls.length; ++i)
    {
      var curAssetUrl = this.playerAssetUrls[i].url;
      var curAnimationClips = this.playerAssetUrls[i].animationClips;
      var curLodUrl = this.playerAssetUrls[i].lodUrl;
      var curStaticUrl = this.playerAssetUrls[i].staticUrl;

      pList.push(new Promise(function (resolve, reject) 
      {
        loadAssets(curAssetUrl, curAnimationClips, curLodUrl, curStaticUrl, resolve);
      }));
    }

    Promise.all(pList).then(function (results) 
    {
      console.log(results);

      if (playerAssetCallback)
      {
        playerAssetCallback(results);
      }
    });
  }

  addVrSpace()
  {
    switch (this.vrSpaceId)
    {
      case '0':
        this.vrSpace.AddStadium();
        break;

      default:
        this.vrSpace.AddStadium();
        break;
    }
  }

  setupScene(playerAssetCallback) 
  {
    this.setCamera();

    this.addVrSpace();

    this.loadPlayerAsset(playerAssetCallback);

    window.content = this.content;
  }

  setCamera() 
  {
    this.defaultCamera.position.copy(new Vector3(0.0, 10.0, 15.0));
    this.defaultCamera.lookAt(new Vector3());

    this.activeCamera = this.defaultCamera;
  }

  addGUI() 
  {
    const gui = this.gui = new GUI({autoPlace: false, width: 260, hideable: true});

    const perfFolder = gui.addFolder('Performance');
    const perfLi = document.createElement('li');
    this.stats.dom.style.position = 'static';
    perfLi.appendChild(this.stats.dom);
    perfLi.classList.add('gui-stats');
    perfFolder.__ul.appendChild( perfLi );

    const guiWrap = document.createElement('div');
    this.el.appendChild( guiWrap );
    guiWrap.classList.add('gui-wrap');
    guiWrap.appendChild(gui.domElement);
    gui.open();
  }
};

