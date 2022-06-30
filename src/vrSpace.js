import {
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  MeshBasicMaterial,
  Mesh,
  Color,
  LoadingManager,
  FloatType,
  PMREMGenerator,
  AnimationMixer,
  PlaneGeometry
} from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import { GLTFLoader } from './lib/GLTFLoaderEx';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { MMONetwork } from './network/MMONetwork';

import { MMOPlayerMgr, MMOPlayer } from './network/MMOPlayer';

import { GUI } from 'dat.gui';
import { Vector4 } from 'three';
import { Clock } from 'three';
import { AmbientLight } from 'three';

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { MeshBVH } from 'three-mesh-bvh'

import TextTexture from '@seregpie/three.text-texture';

export class VrSpace
{
  constructor(_scene, _renderer)
  {
    this.scene = _scene;
    this.renderer = _renderer;
  }

  createBVH(gltfScene)
  {
    const geometries = [];
    gltfScene.traverse (function(node)
    {
      if (node.geometry)
      {
        const cloned = node.geometry.clone();
        cloned.applyMatrix4( node.matrixWorld );
        for ( const key in cloned.attributes ) {
          if ( key !== 'position' ) {
            cloned.deleteAttribute( key );
          }
        }
        geometries.push(cloned);
      }
      
    });

		// create the merged geometry
		const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
		mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, {lazyGeneration: false});

		this.collider = new Mesh(mergedGeometry);
		this.collider.material.wireframe = true;
		this.collider.material.opacity = 0.5;
		this.collider.material.transparent = true;
  }

  getCubeMapTexture(evnMapAsset) 
  {
    var path = evnMapAsset;

    var scope = this;
    return new Promise( ( resolve, reject ) => 
    {
      if (!path)
      {
        resolve( { envMap: null } );
      }
      else if (path.indexOf('.hdr') >= 0)
      {
        new RGBELoader().setDataType( FloatType ).load( path, ( texture ) => {

          scope.pmremGenerator = new PMREMGenerator( scope.renderer );
          scope.pmremGenerator.compileEquirectangularShader();

          const envMap = scope.pmremGenerator.fromEquirectangular( texture ).texture;
          scope.pmremGenerator.dispose();

          resolve( { envMap } );

        }, undefined, reject );
      }
    });
  }

  addItems()
  {
    
  }

  AddClassroom()
  {
    var _self = this;
    var loadingManager = new LoadingManager();

    loadingManager.setURLModifier('');

		const loader = new GLTFLoader(loadingManager);
		loader.setCrossOrigin('anonymous');
    loader.setAsyncLightMap(true , 0, 0, 0.6);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );
    
		loader.load('assets/models/shxthdr/scene.gltf', (gltf) => {
			const scene = gltf.scene || gltf.scenes[0];
      scene.position.y = -0.55;
      scene.scale.x = 0.6;
      scene.scale.y = 0.6;
      scene.scale.z = 0.6;
      _self.scene.add(scene);

      scene.updateMatrixWorld( true );

      // //35、36、47、43
      scene.traverse (function(node)
      {
        if (node.name.indexOf('35') >= 0 ||
            node.name.indexOf('36') >= 0 ||
            node.name.indexOf('43') >= 0 ||
            node.name.indexOf('47') >= 0)
        {
          node.material.emissive = new Color(0xffffff);
          node.material.emissiveMap = node.material.map;

          var material = new MeshBasicMaterial();
          material.map = node.material.map;
          material.transparent = node.material.transparent;

          node.material = material;
          
        }
      });

      this.createBVH(scene);

      // Spawn points
      // Random position
      var spawnPoints = [{x: -5.664784476650146, y: 0, z: -4.359509851040454},{x: -6.810361908763262, y: 0, z: -4.859634710688103},{x: -6.9113353466509375, y: 0, z: -3.3857607795660636},{x: -5.53533210822801, y: 0, z: -2.4426401877010733},{x: -4.386635196897043, y: 0, z: -2.7897638035189},{x: -4.719592803728742, y: 0, z: -3.890508656812762},{x: -5.393295989958538, y: 0, z: -1.9015187888535718},{x: -6.120136656495237, y: 0, z: -0.8845612452616706},{x: -6.706158739207245, y: 0, z: 0.496227702613374},{x: -6.561137801284839, y: 0, z: 1.6370471131968838},{x: -5.748465448923774, y: 0, z: 2.3019257846159165},{x: -4.391847404653052, y: 0, z: 1.7899809809904719},{x: -3.2167993539403152, y: 0, z: 0.7040426408826201},{x: -1.9871258280329664, y: 0, z: 0.4795364724092687},{x: -0.8373657036120858, y: 0, z: 0.5030238369205107},{x: 1.2080194873092431, y: 0, z: 0.640499001076514},{x: 2.590496138787086, y: 0, z: 0.20316811019569114},{x: 3.9142833053541266, y: 0, z: -0.781762109481013},{x: 4.5527558970940065, y: 0, z: -1.551406670039302},{x: 4.5527558970940065, y: 0, z: -1.551406670039302},{x: 4.5527558970940065, y: 0, z: -1.551406670039302},{x: 4.363667585799324, y: 0, z: -2.3287390381623094},{x: 4.887914825422556, y: 0, z: -3.3522940350957504},{x: 5.035216523477179, y: 0, z: -4.341385643466901},{x: 4.698148355452305, y: 0, z: -5.335812639331535},{x: 5.512655916345072, y: 0, z: -5.915965578864323},{x: 6.3104162123844, y: 0, z: -5.622574184881377},{x: 7.024219603279111, y: 0, z: -5.983800871530097},{x: 7.97011003472606, y: 0, z: -5.895532577691839},{x: 8.8063841145045, y: 0, z: -5.260595050457265},{x: 8.725083219315525, y: 0, z: -4.464736919606377},{x: 7.877092396445146, y: 0, z: -3.9347260099756234},{x: 7.311660328231523, y: 0, z: -3.049973741690499},{x: 6.813383260913493, y: 0, z: -2.0693005218129734},{x: 6.742818860460882, y: 0, z: -0.9715661890216711},{x: 7.328747871595335, y: 0, z: -0.10025270128548613},{x: 7.992862577272616, y: 0, z: 0.43026747524239395},{x: 8.001616102996675, y: 0, z: 1.3302249052286126},{x: 7.575685084335274, y: 0, z: 2.179390829734574},{x: 6.926174054992848, y: 0, z: 2.872669577975525},{x: 6.080218225216648, y: 0, z: 2.7898521035654706},{x: 5.239928553980136, y: 0, z: 2.3466667378174324},{x: 4.311609101950851, y: 0, z: 1.2987053859613311},{x: 4.072980488045402, y: 0, z: 0.9171868613448131}];
      MMOPlayerMgr.SetSpawnPoints(spawnPoints);

      let texture = new TextTexture({
        alignment: 'left',
        color: '#ff0000',
        fontFamily: 'system-ui',
        fontSize: 64,
        //fontStyle: 'italic',
        strokeColor: '#ff0000',
        strokeWidth: 0.05,
        text: [
          '2022.05.19',
          '00:32:23'
        ].join('\n'),
      });

      const geometry = new PlaneGeometry( 1, 1 );
      const pmaterial = new MeshBasicMaterial( {color: 0xffff00, map: texture, transparent: true} );
      const plane = new Mesh( geometry, pmaterial );
      texture.redraw();
      plane.scale.setY(texture.height / texture.width);

      plane.scale.x *= 1.8;
      plane.scale.y *= 1.8;
      plane.scale.z *= 1.8;
      plane.rotation.y = Math.PI * 0.5;

      plane.position.x -= 11.5;
      plane.position.y += 3.15;
      plane.position.z -= 0.6;
      _self.scene.add( plane );

      setInterval(function()
      {
        function getNowFormatDate () {
          let date = new Date ();
          let seperator1 = "-";
          let seperator2 = ":";
          let month = date.getMonth () + 1 < 10 ? "0" + (date.getMonth () + 1) : date.getMonth () + 1;
          let strDate = date.getDate () < 10 ? "0" + date.getDate () : date.getDate ();
          let currentdate = [date.getFullYear () + seperator1 + month + seperator1 + strDate, 
              (date.getHours() < 10 ? '0':'') + date.getHours() + seperator2 + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + seperator2 + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds()].join('\n');

          return currentdate;
        }
        texture.text = getNowFormatDate();
        texture.redraw();
      },1000);
		}, 
		function ( xhr ) 
		{

		}, null);

    this.getCubeMapTexture( 'assets/environment/footprint_court_2k.hdr' ).then(( { envMap } ) => 
    {
      _self.scene.environment = envMap;
    });

    // Add items
    {
      var _self = this;
      var loadingManager = new LoadingManager();

      loadingManager.setURLModifier('');

      const loader = new GLTFLoader(loadingManager);
      loader.setCrossOrigin('anonymous');
      loader.setAsyncLightMap(true , 0, 0, 0.6);

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath( 'lib/draco/' );
      
      loader.load('assets/models/items/tesla_roadster_2020/scene.gltf', (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        scene.position.z -= 4.0;
        scene.position.y += 0.3;

        scene.rotation.y = Math.PI * 0.35;

        scene.scale.x = 1.3;
        scene.scale.y = 1.3;
        scene.scale.z = 1.3;
        _self.scene.add(scene);
      }, 
      null, null);

      loader.load('assets/models/items/cute_home_robot/scene.gltf', (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        scene.position.x += 8.6;
        scene.position.y += 0.19;
        scene.position.z -= 0.6;

        scene.rotation.y = -Math.PI * 0.45;

        scene.scale.x = 0.3;
        scene.scale.y = 0.3;
        scene.scale.z = 0.3;
        _self.scene.add(scene);

        var mixer = new AnimationMixer(scene);

        gltf.animations.forEach( ( clip ) => {
          mixer.clipAction( clip ).play();});
          setInterval(function(){ mixer.update(0.03);}, 30);
        }, null, null);
    };

    const directionalLight0  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight0.position.set(0.5, 1.2, 0.5);

    this.scene.add(directionalLight0);

    const directionalLight1  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight1.position.set(-0.5, 1.2, 0.5);

    this.scene.add(directionalLight1);

    const ambientLight  = new AmbientLight(0xFFFFFF, 1.7);
    this.scene.add(ambientLight);
  }
  
  AddPodium()
  {
    var _self = this;
    var loadingManager = new LoadingManager();

    loadingManager.setURLModifier('');

		const loader = new GLTFLoader(loadingManager);
		loader.setCrossOrigin('anonymous');
    loader.setAsyncLightMap(true , 0, 0, 1.6);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );
    
    loader.load('assets/models/podium/scene.gltf', (gltf) => {
			const scene = gltf.scene || gltf.scenes[0];
      _self.scene.add(scene);

      scene.updateMatrixWorld( true );

      // //35、36、47、43
      scene.traverse (function(node)
      {
        if (node.material)
        {
          node.material.envMapIntensity = 0.1;
        }
      });

      this.createBVH(scene);
		}, 
		function ( xhr ) 
		{

		}, null);

    this.getCubeMapTexture( 'assets/environment/footprint_court_2k.hdr' ).then(( { envMap } ) => 
    {
      _self.scene.environment = envMap;
    });

    // Spawn points
    // Random position
    var spawnPoints = [{"x":-3.7223891478042375,"y":0,"z":-5.352232233326957},{"x":-3.5992576943696126,"y":0,"z":-7.096802550098154},{"x":-3.2472264459362687,"y":0,"z":-8.910191539889139},{"x":3.9903896396142726,"y":0,"z":-5.644124926110619},{"x":3.5274668335482846,"y":0,"z":-7.771693709688524},{"x":3.7629385919886897,"y":0,"z":-10.45807843565142},{"x":6.697272963111572,"y":0,"z":0.06954246521521858},{"x":6.419036758372365,"y":0,"z":2.6222155027914176},{"x":6.771501128125717,"y":0,"z":4.622834810666556},{"x":7.24786478492797,"y":0,"z":7.873851067353921},{"x":7.546818638935018,"y":0,"z":12.162634604421308},{"x":7.481887963640771,"y":0,"z":15.502342969666428},{"x":5.156174304398956,"y":0,"z":17.824839480886435},{"x":2.544810626806745,"y":0,"z":19.725747371878008},{"x":-0.25842592654837343,"y":0,"z":18.56744546088032},{"x":-1.9668513385107513,"y":0,"z":20.01054548374379},{"x":-4.375018870237449,"y":0,"z":19.207164605026186},{"x":-6.554856695999146,"y":0,"z":17.89168050352688},{"x":-8.394869268581235,"y":0,"z":15.988903562954322},{"x":-8.206105167371271,"y":0,"z":12.063017028375324},{"x":-7.1139307792176885,"y":0,"z":8.81049692257716},{"x":-7.667214171177738,"y":0,"z":3.8549439663586016},{"x":-9.001345118797373,"y":0,"z":1.1948465209125658},{"x":-7.3869272583082175,"y":0,"z":-3.4524609414548153},{"x":-5.473963698494737,"y":0,"z":-4.326055000812828}]
    MMOPlayerMgr.SetSpawnPoints(spawnPoints);

    // Add items
    {
      var _self = this;
      var loadingManager = new LoadingManager();

      loadingManager.setURLModifier('');

      const loader = new GLTFLoader(loadingManager);
      loader.setCrossOrigin('anonymous');
      loader.setAsyncLightMap(true , 0, 0, 0.6);

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath( 'lib/draco/' );
      
      loader.load('assets/models/items/tesla_roadster_2020/scene.gltf', (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        scene.position.z += 11.8;
        scene.position.y += 0.2;

        scene.rotation.y = Math.PI * 0.35;

        scene.scale.x = 1.3;
        scene.scale.y = 1.3;
        scene.scale.z = 1.3;
        _self.scene.add(scene);
      }, 
      null, null);
    };

    const directionalLight0  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight0.position.set(0.5, 1.2, 0.5);

    //this.scene.add(directionalLight0);

    const directionalLight1  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight1.position.set(-0.5, 1.2, 0.5);

    //this.scene.add(directionalLight1);

    const ambientLight  = new AmbientLight(0xFFFFFF, 1.7);
    //this.scene.add(ambientLight);
  }

  AddGallery()
  {
    var _self = this;
    var loadingManager = new LoadingManager();

    loadingManager.setURLModifier('');

		const loader = new GLTFLoader(loadingManager);
		loader.setCrossOrigin('anonymous');
    loader.setAsyncLightMap(true , 0, 0, 3.0);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );
    
    var vrSceneUrl = 'assets/models/shxthdr/scene.gltf';
    vrSceneUrl = 'assets/models/showroom/scene.gltf';

		loader.load(vrSceneUrl, (gltf) => {
			const scene = gltf.scene || gltf.scenes[0];
      _self.scene.add(scene);

      scene.updateMatrixWorld( true );

      if (true)
      {
        // //35、36、47、43
        scene.traverse (function(node)
        {
          // }
          if (node.material)
          {
            node.material.envMapIntensity = 0.3;
          }
          
        });
      }

      this.createBVH(scene);

      // Spawn points
      var spawnPoints = [{"x":-0.08894339965878863,"y":0,"z":-2.0746154531342476},{"x":0.2189032672825468,"y":0,"z":-6.012572449633199},{"x":0.4375053262451864,"y":0,"z":-8.703708481092251},{"x":-2.762420507032615,"y":0,"z":-8.725495209194166},{"x":-5.974267189026353,"y":0,"z":-8.040239930266283},{"x":-8.824201134289396,"y":0,"z":-8.059643734982052},{"x":-10.592522285584435,"y":0,"z":-10.411673668376212},{"x":-5.638563282467585,"y":0,"z":-11.141774410362105},{"x":-2.729091206438747,"y":0,"z":-12.966867282786252},{"x":0.07408061431990426,"y":0,"z":-13.548327212707498},{"x":-0.7197291223608819,"y":0,"z":-17.25528419321443},{"x":-0.36751616448078345,"y":0,"z":-19.730349047375142},{"x":-0.028688401836009444,"y":0,"z":-23.061499752216726},{"x":0.13228349700062259,"y":0,"z":-25.756696970934584},{"x":0.25748386276244695,"y":0,"z":-27.852961474381807},{"x":-2.421168438068874,"y":0,"z":-28.467140317052838},{"x":-6.254467327413657,"y":0,"z":-29.090366219711633},{"x":-10.085659930248486,"y":0,"z":-29.470449421107716},{"x":-13.369539304106883,"y":0,"z":-29.79623502230436},{"x":-16.7039865685916,"y":0,"z":-29.423601026359627},{"x":-20.05389606349861,"y":0,"z":-29.329590524495792},{"x":-23.06659806105981,"y":0,"z":-29.23765539473582},{"x":-25.902675702119335,"y":0,"z":-29.519015686678376},{"x":-28.32373351360199,"y":0,"z":-29.22626939506857},{"x":-30.029382148128832,"y":0,"z":-29.857358291930105},{"x":-21.41413541718861,"y":0,"z":-32.13950876548148},{"x":-18.516969065572475,"y":0,"z":-32.86429053542671},{"x":-21.82062935418101,"y":0,"z":-35.90642212626949},{"x":-18.297261747382343,"y":0,"z":-38.46717128453973},{"x":-21.84719595391391,"y":0,"z":-39.81632858800717}];

      MMOPlayerMgr.SetSpawnPoints(spawnPoints);
		}, 
		function ( xhr ) 
		{

		}, null);

    this.getCubeMapTexture( 'assets/environment/footprint_court_2k.hdr' ).then(( { envMap } ) => 
    {
      _self.scene.environment = envMap;

      _self.renderer.toneMappingExposure = 0.1;
    });

    const directionalLight0  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight0.position.set(0.5, 1.2, 0.5);

    ///this.scene.add(directionalLight0);

    const directionalLight1  = new DirectionalLight(0xFFFFFF, 0.8);
    directionalLight1.position.set(-0.5, 1.2, 0.5);

    this.scene.add(directionalLight1);

    const ambientLight  = new AmbientLight(0xFFFFFF, 0.7);
    this.scene.add(ambientLight);
  }

  AddArtGallery()
  {
    var _self = this;
    var loadingManager = new LoadingManager();

    loadingManager.setURLModifier('');

		const loader = new GLTFLoader(loadingManager);
		loader.setCrossOrigin('anonymous');
    loader.setAsyncLightMap(true , 0, 0, 3.0);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );
    
    var vrSceneUrl = 'assets/models/art/scene.gltf';

		loader.load(vrSceneUrl, (gltf) => {
			const scene = gltf.scene || gltf.scenes[0];
      //scene.position.y = -0.55;
      //scene.scale.x = 0.6;
      //scene.scale.y = 0.6;
      //scene.scale.z = 0.6;
      _self.scene.add(scene);

      scene.updateMatrixWorld( true );

      if (true)
      {
        // //35、36、47、43
        scene.traverse (function(node)
        {
          // }
          if (node.material)
          {
            node.material.envMapIntensity = 0.3;
          }
          
        });
      }

      this.createBVH(scene);

      // Spawn points
      var spawnPoints = [{"x":4.886662553333633,"y":0,"z":10.243455113661259},{"x":2.265171054120378,"y":0,"z":10.89302553248902},{"x":0.07473968058517855,"y":0,"z":10.705572166268603},{"x":-3.2750141161389177,"y":0,"z":10.709156756029504},{"x":-4.974951507655787,"y":0,"z":10.714182204083004},{"x":-5.080626345823995,"y":0,"z":6.8657781497373085},{"x":-4.733020504611931,"y":0,"z":2.402365212162863},{"x":-1.3053451439212305,"y":0,"z":2.4021643016712906},{"x":1.3714588812639261,"y":0,"z":1.87234517966564},{"x":4.100189570257214,"y":0,"z":2.0118019696502096},{"x":5.067350431312902,"y":0,"z":4.111111348670361},{"x":-1.9569317105909652,"y":0,"z":0.1449365354364021},{"x":-1.9473351399115684,"y":0,"z":-2.2550401717984427},{"x":1.5127614446099744,"y":0,"z":-4.631748457952572},{"x":-1.751997308561557,"y":0,"z":-4.5720491526515525},{"x":-9.833527300077954,"y":0,"z":-4.40445439781102},{"x":-7.267347905636104,"y":0,"z":-7.883686801899484},{"x":-3.6918509869864695,"y":0,"z":-8.051885634883034},{"x":2.3777918213347626,"y":0,"z":-7.792454161846872},{"x":9.405969237480175,"y":0,"z":-0.1594262969249671},{"x":9.409673185383065,"y":0,"z":4.245018217439675},{"x":9.21992670886203,"y":0,"z":7.060421612096985},{"x":-9.83571623975454,"y":0,"z":-2.403882121634142},{"x":-9.775220978599316,"y":0,"z":1.6956651067098436},{"x":-9.719977863943507,"y":0,"z":5.245235249457157},{"x":-9.679518117998407,"y":0,"z":7.844920424427021},{"x":-9.653712127769554,"y":0,"z":9.49471634383281},{"x":-6.006647515561787,"y":0,"z":1.5270538593806617},{"x":3.5051971355064473,"y":0,"z":0.45097085487987726},{"x":5.453911715269851,"y":0,"z":0.3801790007046451},{"x":0.4576117662888137,"y":0,"z":0.03100199081951538}];
      
      MMOPlayerMgr.SetSpawnPoints(spawnPoints);
		}, 
		function ( xhr ) 
		{

		}, null);

    this.getCubeMapTexture( 'assets/environment/footprint_court_2k.hdr' ).then(( { envMap } ) => 
    {
      _self.scene.environment = envMap;

      _self.renderer.toneMappingExposure = 0.1;
    });

    const directionalLight0  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight0.position.set(0.5, 1.2, 0.5);

    ///this.scene.add(directionalLight0);

    const directionalLight1  = new DirectionalLight(0xFFFFFF, 0.8);
    directionalLight1.position.set(-0.5, 1.2, 0.5);

    this.scene.add(directionalLight1);

    const ambientLight  = new AmbientLight(0xFFFFFF, 0.7);
    this.scene.add(ambientLight);
  }

  AddStadium()
  {
    var _self = this;
    var loadingManager = new LoadingManager();

    loadingManager.setURLModifier('');

		const loader = new GLTFLoader(loadingManager);
		loader.setCrossOrigin('anonymous');
    loader.setAsyncLightMap(true , 3, 0, 6.0);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );
    
    var vrSceneUrl = 'assets/models/Stadium_00/Stadium_00.gltf';

		loader.load(vrSceneUrl, (gltf) => {
			const scene = gltf.scene || gltf.scenes[0];
      _self.scene.add(scene);

      scene.updateMatrixWorld( true );

      if (true)
      {
        // //35、36、47、43
        scene.traverse (function(node)
        {
          // }
          if (node.material)
          {
            node.material.envMapIntensity = 0.3;
          }
          
        });
      }

      this.createBVH(scene);

      // Spawn points
      var spawnPoints = [{"x":4.886662553333633,"y":0,"z":10.243455113661259},{"x":2.265171054120378,"y":0,"z":10.89302553248902},{"x":0.07473968058517855,"y":0,"z":10.705572166268603},{"x":-3.2750141161389177,"y":0,"z":10.709156756029504},{"x":-4.974951507655787,"y":0,"z":10.714182204083004},{"x":-5.080626345823995,"y":0,"z":6.8657781497373085},{"x":-4.733020504611931,"y":0,"z":2.402365212162863},{"x":-1.3053451439212305,"y":0,"z":2.4021643016712906},{"x":1.3714588812639261,"y":0,"z":1.87234517966564},{"x":4.100189570257214,"y":0,"z":2.0118019696502096},{"x":5.067350431312902,"y":0,"z":4.111111348670361},{"x":-1.9569317105909652,"y":0,"z":0.1449365354364021},{"x":-1.9473351399115684,"y":0,"z":-2.2550401717984427},{"x":1.5127614446099744,"y":0,"z":-4.631748457952572},{"x":-1.751997308561557,"y":0,"z":-4.5720491526515525},{"x":-9.833527300077954,"y":0,"z":-4.40445439781102},{"x":-7.267347905636104,"y":0,"z":-7.883686801899484},{"x":-3.6918509869864695,"y":0,"z":-8.051885634883034},{"x":2.3777918213347626,"y":0,"z":-7.792454161846872},{"x":9.405969237480175,"y":0,"z":-0.1594262969249671},{"x":9.409673185383065,"y":0,"z":4.245018217439675},{"x":9.21992670886203,"y":0,"z":7.060421612096985},{"x":-9.83571623975454,"y":0,"z":-2.403882121634142},{"x":-9.775220978599316,"y":0,"z":1.6956651067098436},{"x":-9.719977863943507,"y":0,"z":5.245235249457157},{"x":-9.679518117998407,"y":0,"z":7.844920424427021},{"x":-9.653712127769554,"y":0,"z":9.49471634383281},{"x":-6.006647515561787,"y":0,"z":1.5270538593806617},{"x":3.5051971355064473,"y":0,"z":0.45097085487987726},{"x":5.453911715269851,"y":0,"z":0.3801790007046451},{"x":0.4576117662888137,"y":0,"z":0.03100199081951538}];
      
      //MMOPlayerMgr.SetSpawnPoints(spawnPoints);
      MMOPlayerMgr.SetSpawnPoints(null);
		}, 
		function ( xhr ) 
		{

		}, null);

    this.getCubeMapTexture( 'assets/environment/footprint_court_2k.hdr' ).then(( { envMap } ) => 
    {
      _self.scene.environment = envMap;

      //_self.renderer.toneMappingExposure = 0.1;
    });

    const directionalLight0  = new DirectionalLight(0xFFFFFF, 1.7);
    directionalLight0.position.set(0.5, 1.2, 0.5);

    ///this.scene.add(directionalLight0);

    const directionalLight1  = new DirectionalLight(0xFFFFFF, 0.8);
    directionalLight1.position.set(-0.5, 1.2, 0.5);

    //this.scene.add(directionalLight1);

    const ambientLight  = new AmbientLight(0xFFFFFF, 0.9);
    this.scene.add(ambientLight);
  }
}

