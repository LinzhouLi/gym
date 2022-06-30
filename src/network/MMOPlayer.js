import { MMOBaseObject , MMOConstants} from './MMONetwork';
import {clone as SkeletonUtilsClone} from 'three/examples/jsm/utils/SkeletonUtils';

import { AnimationMixer, LoopOnce, TextureLoader, PlaneGeometry, Object3D, BoxGeometry, MeshStandardMaterial } from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls';

import TextTexture from '@seregpie/three.text-texture';

import {
	Vector3,
	MeshBasicMaterial,
	Mesh,
	CircleGeometry,
	Line3,
	Box3,
	Matrix4,
	Sprite,
	SpriteMaterial
  } from 'three';
import { Quaternion } from 'three';

class MMOPlayerMgr
{
	static LocalPlayer = null;
	static NetworkPlayers = [];

	static SpawnPoints = null;

	constructor()
	{

	}

	static SetSpawnPoints(spawnPoints)
	{
		MMOPlayerMgr.SpawnPoints = spawnPoints;
	}

	static GetSpawnPoint()
	{
		if (MMOPlayerMgr.SpawnPoints && MMOPlayerMgr.SpawnPoints.length > 0)
		{
			function getRandomInt(min, max)
			{
				min = Math.ceil(min);
				max = Math.floor(max);
				return Math.floor(Math.random() * (max - min)) + min;
			}

			var spId = getRandomInt(0, MMOPlayerMgr.SpawnPoints.length);

			return new Vector3(MMOPlayerMgr.SpawnPoints[spId].x, MMOPlayerMgr.SpawnPoints[spId].y, MMOPlayerMgr.SpawnPoints[spId].z);
		}
		else
		{
			var xSize = 70;
			var zSize = 100;

			return new Vector3(Math.random() * xSize - xSize * 0.5, 0.0, Math.random() * zSize - zSize * 0.5);
		}
	}
}

class PlayerCamera
{
	static eType =
	{
		TPS : 0,
		FPS	: 1
	}

	constructor(_renderer, _renderableObject)
	{
		this.renderer = _renderer;

		this.cameraOffset = new Vector3(0.0, 1.8, 4.0);

		this.playerHalfHeight = 0.8;

		this.forwardFlag = true;
		this.backwardFlag = false;
		this.rightFlag = false;
		this.leftFlag = false;

		this.isSyncNeeded = false;

		this.sceneCollider = null;
	}

	SetCamera(_renderableObject, _camera, _type)
	{
		var scope = this;

		this.renderableObject = _renderableObject;
		this.camera = _camera;
		this.type = _type;

		switch (_type)
		{
		case PlayerCamera.eType.TPS:
			{
				if (this.camera)
				{
					this.camera.position.addVectors(this.renderableObject.position, this.cameraOffset);

					this.tpsControls = new OrbitControls(this.camera, this.renderer.domElement);
					this.tpsControls.autoRotate = false;
					this.tpsControls.autoRotateSpeed = -10;
					this.tpsControls.screenSpacePanning = true;
	
					this.tpsControls.maxPolarAngle = Math.PI * 0.49;
					this.tpsControls.minPolarAngle = Math.PI * 0.1;
	
					this.tpsControls.minDistance = 1.0;
					this.tpsControls.maxDistance = 4.0;
	
					this.tpsControls.rotateSpeed = 0.2;
	
					this.tpsControls.enablePan = false;
	
					var playerTaget = new Vector3().addVectors(this.renderableObject.position, new Vector3(0.0, this.playerHalfHeight, 0.0));
	
					this.tpsControls.target = playerTaget;
					this.camera.lookAt(playerTaget);
				}
			}
			break;

		case PlayerCamera.eType.FPS:
			{
				if (this.camera)
				{
					this.camera.position.addVectors(this.renderableObject.position, this.cameraOffset);
					this.camera.lookAt(this.cameraOffset);

					const blocker = document.getElementById('blocker');
					blocker.style.display = 'block';

					const instructions = document.getElementById('instructions');

					instructions.addEventListener('click', function () {
						scope.fpsControls.lock();
					} );

					this.fpsControls = new PointerLockControls(this.camera, document.body);
					this.fpsControls.addEventListener('lock', function () {
						instructions.style.display = 'none';
						blocker.style.display = 'none';
					} );
					this.fpsControls.addEventListener('unlock', function () {
						blocker.style.display = 'block';
						instructions.style.display = '';
					} );

					this.renderableObject.visible = false;
				}
			}
			break;
		}
	}

	UpdateTPS(movementStatus, collider, deltaTime)
	{
		//if (this.renderableObject && this.tpsControls)
		{
			if (movementStatus.x > 0.0)
			{
				if (this.forwardFlag == false)
				{
					this.forwardFlag = true;
				}
			}
			else
			{
				if (this.forwardFlag == true)
				{
					this.forwardFlag = false;
				}
			}

			if (movementStatus.y > 0.0)
			{
				if (this.backwardFlag == false)
				{
					this.backwardFlag = true;
				}
			}
			else
			{
				if (this.backwardFlag == true)
				{
					this.backwardFlag = false;
				}
			}

			if (movementStatus.z > 0.0)
			{
				if (this.leftFlag == false)
				{
					this.leftFlag = true;
				}
			}
			else
			{
				if (this.leftFlag == true)
				{
					this.leftFlag = false;
				}
			}

			if (movementStatus.w > 0.0)
			{
				if (this.rightFlag == false)
				{
					this.rightFlag = true;
				}
			}
			else
			{
				if (this.rightFlag == true)
				{
					this.rightFlag = false;
				}
			}

			var moveSpeed = 0.05;

			var playerForward = new Vector3();
			this.renderableObject.getWorldDirection(playerForward);
			playerForward.y = 0;
			playerForward.normalize();
			
			var cameraDirection = new Vector3();
			this.camera.getWorldDirection(cameraDirection);
			cameraDirection.y = 0;

			var fbDirection = new Vector3().copy(cameraDirection);

			var lrDirection = new Vector3(fbDirection.z, 0.0, -fbDirection.x);

			fbDirection.multiplyScalar((this.forwardFlag ? 1.0: 0.0) + (this.backwardFlag ? -1.0: 0.0));
			fbDirection.normalize();

			lrDirection.multiplyScalar((this.leftFlag ? 1.0: 0.0) + (this.rightFlag ? -1.0: 0.0));
			lrDirection.normalize();

			var moveDirection = new Vector3().addVectors(fbDirection, lrDirection);
			moveDirection.normalize();

			var hasMovement = true;
			if (moveDirection.lengthSq() < 0.00000001)
			{
				moveDirection = new Vector3().copy(cameraDirection);
				moveDirection.normalize();

				hasMovement = false;
			}
			
			var hasRotation = playerForward.angleTo(moveDirection) != 0;

			if(hasRotation)
			{
				this.isSyncNeeded = true;
			}

			var lerpDirection = new Vector3().lerpVectors(playerForward, moveDirection, 0.6);
			this.renderableObject.lookAt(new Vector3().addVectors(this.renderableObject.position, new Vector3(lerpDirection.x, 0.0, lerpDirection.z)));

			//var quat = new Quaternion().setFromUnitVectors(playerForward, lerpDirection);
			//this.renderableObject.quaternion.multiply(quat);;

			if (hasMovement)
			{
				var movement = new Vector3(moveSpeed * moveDirection.x, 0.0, moveSpeed * moveDirection.z);
				
				// Check and modify movement at first
				movement = this.ValidateMovement(movement, collider);

				if (movement)
				{
					this.renderableObject.position.x += movement.x;
					this.renderableObject.position.z += movement.z;
		
					this.camera.position.x += movement.x;
					this.camera.position.z += movement.z;
				}
				else
				{
					hasMovement = false;
				}
			}

			if(hasMovement)
			{
				this.isSyncNeeded = true;
			}

			var playerTarget = new Vector3().addVectors(this.renderableObject.position, new Vector3(0.0, this.playerHalfHeight, 0.0));

			this.tpsControls.target = playerTarget;
			this.camera.lookAt(playerTarget);

			this.tpsControls.update();

			var rt = 
			{
				hasMovement: hasMovement
			};

			return rt;
		}
	}

	UpdateFPS(movementStatus, collider, delta)
	{
		var velocity = new Vector3();
		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

		var direction = new Vector3();
		direction.z = movementStatus.x - movementStatus.y;
		direction.x = movementStatus.w - movementStatus.z;
		direction.normalize(); // this ensures consistent movements in all directions

		if ( movementStatus.x > 0 || movementStatus.y > 0 ) velocity.z -= direction.z * 400.0 * delta;
		if ( movementStatus.z > 0 || movementStatus.w > 0 ) velocity.x -= direction.x * 400.0 * delta;

		// if ( onObject === true ){
		// 	velocity.y = Math.max( 0, velocity.y );
		// 	canJump = true;
		// }

		this.fpsControls.moveRight( - velocity.x * delta );
		this.fpsControls.moveForward( - velocity.z * delta );

		this.renderableObject.position.x = this.camera.position.x;
		this.renderableObject.position.z = this.camera.position.z;
	}

	Update(movementStatus, collider, deltaTime)
	{
		if (this.renderableObject)
		{
			if (this.tpsControls)
			{
				return this.UpdateTPS(movementStatus, collider, deltaTime);
			}
			else if (this.fpsControls)
			{
				return this.UpdateFPS(movementStatus, collider, deltaTime);
			}
		}
	}

	ValidateMovement(movement, collider)
	{
		if (movement && collider)
		{
			// this.playerCapsule = new Mesh(
			// new RoundedBoxGeometry(0.5, 1.7, 0.5, 10, 0.25),
			// new MeshStandardMaterial()
			// );
			// this.playerCapsule.geometry.translate( 0, 0.9, 0 );
			// this.playerCapsule.capsuleInfo = {
			// radius: 0.25,
			// segment: new Line3( new Vector3( 0, 0.27, 0.0 ), new Vector3( 0, 1.4, 0.0 ) )
			// };
	
			// this.scene.add(this.playerCapsule);

			var capsuleInfo = 
			{
				radius: 0.25,
				segment: new Line3(new Vector3(0, 0.27, 0.0), new Vector3(0, 1.4, 0.0))
			};

			let tempBox = new Box3();
			tempBox.makeEmpty();

			let tempMat = new Matrix4();
			let tempSegment = new Line3();

			let tempVector = new Vector3();
			let tempVector2 = new Vector3();

			tempMat.copy(collider.matrixWorld ).invert();

			tempSegment.copy(capsuleInfo.segment);

			// get the position of the capsule in the local space of the collider
			tempSegment.start.x += (this.renderableObject.position.x + movement.x);
			tempSegment.start.z += (this.renderableObject.position.z + movement.z);

			tempSegment.end.x += (this.renderableObject.position.x + movement.x);
			tempSegment.end.z += (this.renderableObject.position.z + movement.z);

			tempSegment.start.applyMatrix4(tempMat);
			tempSegment.end.applyMatrix4(tempMat);

			// get the axis aligned bounding box of the capsule
			tempBox.expandByPoint(tempSegment.start);
			tempBox.expandByPoint(tempSegment.end);

			tempBox.min.addScalar(-capsuleInfo.radius);
			tempBox.max.addScalar(capsuleInfo.radius);

			collider.geometry.boundsTree.shapecast( {

				intersectsBounds: box => box.intersectsBox( tempBox ),
			
				intersectsTriangle: tri => {
			
					// check if the triangle is intersecting the capsule and adjust the capsule position if it is.
					const triPoint = tempVector;
					const capsulePoint = tempVector2;
			
					const distance = tri.closestPointToSegment( tempSegment, triPoint, capsulePoint );

					if ( distance < capsuleInfo.radius ) 
					{
						//const depth = capsuleInfo.radius - distance;
						//const direction = capsulePoint.sub( triPoint ).normalize();
				
						//tempSegment.start.addScaledVector( direction, depth );
						//tempSegment.end.addScaledVector( direction, depth );

						movement = null;

						return null;
					}
				}
		
			} );
		}

		return movement;
	}
}

class PlayerState
{
	constructor(_stateName, _animation, _validPreStates, _overState)
	{
		this.stateName = _stateName;
		this.animation = _animation;
		this.validPreStates = _validPreStates;
		this.overState = _overState;

		this.validPreStateMap = {};

		if (this.validPreStates)
		{
			for (var i = 0 ;i < this.validPreStates.length; ++i)
			{
				this.validPreStateMap[this.validPreStates[i]]= true;
			}
		}
	}

	IsConnectedWith(nextState)
	{
		if (this.validPreStates)
		{
			return this.validPreStateMap[nextState] == true;
		}

		return true;
	}
}

class LodPlayer
{
	constructor(logicPlayer, playerAsset)
	{
		this.renderableRoot = new Object3D();
		this.renderableRoot.position.copy(MMOPlayerMgr.GetSpawnPoint());

		this.logicPlayer = logicPlayer;

		this.SetupRendererableObject(playerAsset);
	}

	SetupRendererableObject(playerAsset)
	{
		this.lodObjects = [];

		this.activeObject = null;

		// LOD 0
		if (playerAsset.raw)
		{
			var currentAsset = playerAsset.raw;

			var rawObject = SkeletonUtilsClone(currentAsset.scene ? currentAsset.scene : currentAsset);
	
			// TODO: 
			// 通过gltf对象来创建动画播放器
			rawObject.mixer = new AnimationMixer(rawObject);
			
			rawObject.animationClips = {};
	
			rawObject.clipActions = {};
	
			rawObject.activeAction = null;
	
			rawObject.animationObject = currentAsset.animations;
			rawObject.animationObject.forEach( ( clip ) => {
				rawObject.animationClips[clip.name] = clip;
	
				rawObject.clipActions[clip.name] = rawObject.mixer.clipAction(clip);
			} );

			//this.renderableRoot.add(rawObject);

			this.lodObjects.push(rawObject);

			rawObject.visible = true;
		}

		// LOD 1
		if (playerAsset.lod)
		{
			var currentAsset = playerAsset.lod;

			var rawObject = SkeletonUtilsClone(currentAsset.scene ? currentAsset.scene : currentAsset);
	
			// TODO: 
			// 通过gltf对象来创建动画播放器
			rawObject.mixer = new AnimationMixer(rawObject);
			
			rawObject.animationClips = {};
	
			rawObject.clipActions = {};
	
			rawObject.activeAction = null;
	
			rawObject.animationObject = currentAsset.animations;
			rawObject.animationObject.forEach( ( clip ) => {
				rawObject.animationClips[clip.name] = clip;
	
				rawObject.clipActions[clip.name] = rawObject.mixer.clipAction(clip);
			} );

			//this.renderableRoot.add(rawObject);
			this.lodObjects.push(rawObject);

			rawObject.visible = true;
		}

		// LOD 2
		//if (playerAsset.static)
		{
			var rawObject = null;

			if (false)
			{
				const geometry = new BoxGeometry(0.4, 1.7, 0.4);
				const material = new MeshStandardMaterial( {color: 0x333333} );
				rawObject = new Mesh( geometry, material );
				rawObject.position.y = 0.8;
			}
			else
			{
				rawObject = playerAsset.static.scene.clone();
			}

			//this.renderableRoot.add(rawObject);
			this.lodObjects.push(rawObject);

			rawObject.visible = true;
		}

		this.activeObject = this.lodObjects[1];
	}

	OnAnimationOver(animationInfo)
	{
		//console.log(animationInfo);

		if (animationInfo.isLoop == false)
		{
			// Swith to over state
			this.logicPlayer.SwitchState('over');
		}
		else
		{
			// Repeat current state
			this.logicPlayer.SwitchState('repeat');
		}

		//console.log('------------------state over');
	}

	PlayStateAnimation(animationInfo, fromRpc)
	{
		// TODO: 
		// 1. 获取对应的动画的长度（不要动态获取，最好在初始化时记录下来）
		// 2. 播放状态所对应的动画（使用带有平滑迁移的播放方式）
		// 3. 设置动画播放完后的结束回调，以便进行后续状态的切换

		function getRandomInt(min, max)
		{
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min)) + min;
		}

		for (var i = 0; i < this.lodObjects.length; ++i)
		{
			var activeRenderObject = this.lodObjects[i];

			var animationDuration = 50;
	
			if (animationInfo.clipName && animationInfo.clipName.length > 0 && activeRenderObject.animationClips)
			{
				var clipId = getRandomInt(0, animationInfo.clipName.length);
	
				var clipName = animationInfo.clipName[clipId];
				var activeClip = activeRenderObject.animationClips[clipName];
	
				if (activeRenderObject.clipActions[clipName] && activeClip)
				{
					if (activeRenderObject.activeAction != null && activeRenderObject.activeAction != activeRenderObject.clipActions[clipName])
					{
						activeRenderObject.activeAction.clampWhenFinished = true;
		
						//this.activeAction.stop();
		
						activeRenderObject.activeAction.crossFadeTo(activeRenderObject.clipActions[clipName]);
					}
		
					activeRenderObject.clipActions[clipName].play();
					activeRenderObject.clipActions[clipName].clampWhenFinished = true;
					
					activeRenderObject.activeAction = activeRenderObject.clipActions[clipName];
		
					animationDuration = activeClip.duration * 1000;
				}
			}
		}
		

		if (!fromRpc)
		{
			var scope = this;
			setTimeout(function()
			{
				scope.OnAnimationOver(animationInfo);
			}, animationDuration);
		}
		
	}

	GetAnimationObject()
	{
		return this.activeObject.animationObject;
	}

	GetObject()
	{
		return this.renderableRoot;
	}

	Update(deltaTime)
	{
		this.UpdateLod();

		if(this.activeObject.mixer)
		{
			this.activeObject.mixer.update(deltaTime);
		}
	}

	SwitchLodLevel(lodLevel)
	{
		if (lodLevel < this.lodObjects.length)
		{
			this.renderableRoot.remove(this.activeObject);
			this.activeObject = this.lodObjects[lodLevel];
			this.renderableRoot.add(this.activeObject);
			//this.activeObject.visible = true;
		}
	}

	UpdateLod()
	{
		if (MMOPlayerMgr.LocalPlayer.GetLogicPlayer() == this.logicPlayer)
		{
			this.SwitchLodLevel(0);
		}
		else
		{
			var dist = MMOPlayerMgr.LocalPlayer.GetLogicPlayer().GetRenderableObject().position.distanceToSquared(this.renderableRoot.position);
			if (dist > 400)
			{
				this.SwitchLodLevel(2);
			}
			else if (dist > 25.0)
			{
				this.SwitchLodLevel(1);
			}
			else
			{
				this.SwitchLodLevel(0);
			}

			//this.SwitchLodLevel(0);
		}
	}
}

// State based logic player
class LogicPlayer
{
	static eState =
	{
		Idle 	: 0,
		Walk	: 1,
		Run		: 2,
		Talk	: 3,
		Applaud	: 4
	}

	constructor(playerAsset, renderObjectCallback)
	{
		this.lodPlayer = new LodPlayer(this, playerAsset);

		//this.renderableRoot = new Object3D();

		//this.renderableRoot.position.copy(MMOPlayerMgr.GetSpawnPoint());

		if (renderObjectCallback)
		{
			renderObjectCallback(this.lodPlayer.GetObject());
		}

		this.stateMachine = {};

		this.currentState = null;

		//this.SetupRendererableObject(playerAsset);

		this.RegisterState(this.lodPlayer.GetAnimationObject().clipNames);

		this.SwitchToState(LogicPlayer.eState.Idle);		
	}

	SetupRendererableObject(playerAsset)
	{
		// LOD 0
		{
			var currentAsset = playerAsset.raw;
			this.animationObject = currentAsset.animations;

			var rawObject = SkeletonUtilsClone(currentAsset.scene ? currentAsset.scene : currentAsset);
	
			// TODO: 
			// 通过gltf对象来创建动画播放器
			this.mixer = new AnimationMixer(rawObject);
			
			this.animationClips = {};
	
			this.clipActions = {};
	
			this.activeAction = null;
	
			this.animationObject.forEach( ( clip ) => {
			  
				//this.mixer.clipAction( clip ).play();
				//console.log(clip.name);
	
				this.animationClips[clip.name] = clip;
	
				this.clipActions[clip.name] = this.mixer.clipAction(clip);
			} );
	
			this.renderableRoot.add(rawObject);
		}

		// LOD 1
		{
			var currentAsset = playerAsset.lod;
			this.animationObject = currentAsset.animations;

			var rawObject = SkeletonUtilsClone(currentAsset.scene ? currentAsset.scene : currentAsset);
	
			// TODO: 
			// 通过gltf对象来创建动画播放器
			this.mixer = new AnimationMixer(rawObject);
			
			this.animationClips = {};
	
			this.clipActions = {};
	
			this.activeAction = null;
	
			this.animationObject.forEach( ( clip ) => {
			  
				//this.mixer.clipAction( clip ).play();
				//console.log(clip.name);
	
				this.animationClips[clip.name] = clip;
	
				this.clipActions[clip.name] = this.mixer.clipAction(clip);
			} );
	
			this.renderableRoot.add(rawObject);
		}
		
	}

	RegisterState(clipNames)
	{
		this.stateMachine[LogicPlayer.eState.Idle] = new PlayerState(LogicPlayer.eState.Idle, 
			{
				clipName: clipNames ? clipNames[LogicPlayer.eState.Idle] : ['Animation-10'], // TODO: 替换为具体的动画名
				isLoop: true
			}, null, LogicPlayer.eState.Idle);

		this.stateMachine[LogicPlayer.eState.Walk] = new PlayerState(LogicPlayer.eState.Walk, 
			{
				clipName: clipNames ? clipNames[LogicPlayer.eState.Walk] : ['Animation-50'], // TODO: 替换为具体的动画名
				isLoop: true
			}, [LogicPlayer.eState.Idle, LogicPlayer.eState.Run], LogicPlayer.eState.Idle);

		this.stateMachine[LogicPlayer.eState.Run] = new PlayerState(LogicPlayer.eState.Run,
			{
				clipName: clipNames ? clipNames[LogicPlayer.eState.Run] : ['Animation-30'], // TODO: 替换为具体的动画名
				isLoop: true
			}, [LogicPlayer.eState.Idle, LogicPlayer.eState.Walk], LogicPlayer.eState.Idle);

		this.stateMachine[LogicPlayer.eState.Talk] = new PlayerState(LogicPlayer.eState.Talk, 
			{
				clipName: clipNames ? clipNames[LogicPlayer.eState.Talk] : ['Animation-40'], // TODO: 替换为具体的动画名
				isLoop: false
			}, [LogicPlayer.eState.Idle, LogicPlayer.eState.Applaud], LogicPlayer.eState.Idle);

		this.stateMachine[LogicPlayer.eState.Applaud] = new PlayerState(LogicPlayer.eState.Applaud, {
				clipName: clipNames ? clipNames[LogicPlayer.eState.Applaud] : ['Animation-00'], // TODO: 替换为具体的动画名
				isLoop: false
			}, [LogicPlayer.eState.Idle, LogicPlayer.eState.Talk], LogicPlayer.eState.Idle);
	}

	SwitchToState(nextStateName, fromRpc)
	{
		if (this.currentState == null || (this.currentState.stateName != nextStateName && this.stateMachine[nextStateName].IsConnectedWith(this.currentState.stateName)))
		{
			this.currentState = this.stateMachine[nextStateName];

			//this.PlayStateAnimation(this.stateMachine[nextStateName].animation, fromRpc);

			this.lodPlayer.PlayStateAnimation(this.stateMachine[nextStateName].animation, fromRpc);

			if (!fromRpc)
			{
				this.isSyncNeeded = true;
			}
		}
	}

	SwitchState(status)
	{
		switch (status)
		{
			case 'over':
				this.SwitchToState(this.currentState.overState);
				break;

			case 'repeat':
				this.SwitchToState(this.currentState.stateName);
				break;
		}
	}

	IsSyncNeeded()
	{
		return this.isSyncNeeded || this.playerCamera.isSyncNeeded;
	}

	GetSyncData()
	{
		var worldDirection = new Vector3();
		this.lodPlayer.GetObject().getWorldDirection(worldDirection);

		var syncData = 
		{
			p: [this.lodPlayer.GetObject().position.x, this.lodPlayer.GetObject().position.y, this.lodPlayer.GetObject().position.z],
			r: [worldDirection.x, worldDirection.y, worldDirection.z],
			s: this.currentState.stateName
		}

		this.isSyncNeeded = false;

		this.playerCamera.isSyncNeeded = false;

		return syncData;
	}

	SyncRpcData(data)
	{
		if (data)
		{
			this.lodPlayer.GetObject().position.copy(new Vector3(data.p[0], data.p[1], data.p[2]));

			var worldDirectionVectors = new Vector3(this.lodPlayer.GetObject().position.x + data.r[0], this.lodPlayer.GetObject().position.y + data.r[1], this.lodPlayer.GetObject().position.z + data.r[2]);
			this.renderableRoot.lookAt(worldDirectionVectors);

			//console.log('=========================get state: ' + data.s);
			this.SwitchToState(data.s, true);
		}
	}

	SetCamera(_context, _type)
	{
		this.playerCamera = new PlayerCamera(_context.renderer);

		this.playerCamera.SetCamera(this.lodPlayer.GetObject(), _context.camera, _type);
	}

	Update(deltaTime, movement, collider)
	{
		if (movement && this.playerCamera)
		{
			var rt = this.playerCamera.Update(movement, collider, deltaTime);

			if (rt && rt.hasMovement)
			{
				this.SwitchToState(LogicPlayer.eState.Walk);
			}
			else
			{
				this.SwitchToState(LogicPlayer.eState.Idle);
			}
		}

		if (this.lodPlayer)
		{
			this.lodPlayer.Update(deltaTime);
		}
	}

	GetRenderableObject()
	{
		return this.lodPlayer.GetObject();
	}
}

class MMOPlayer extends MMOBaseObject
{
	constructor(network, _playerTag, _playerAssets, _rendearableObjectCallback, _networkObject, _context) 
	{
		super(network, _playerTag);

		this.context = _context;

		if (_networkObject)
		{
			this.tag = _playerTag;

			this.networkObject = _networkObject;
		}
		else
		{
			this.tag = _playerTag;

			this.networkObject = null;
	
			this.playerAssets = _playerAssets;
			//this.renderableAsset = _gltfAsset.scene;
			//this.animationAsset = _gltfAsset.animations;
	
			this.renderObjectCallback = _rendearableObjectCallback;
	
			this.isSyncNeed = false;
	
			var scope = this;
			this.network.CreateNetworkObject(_playerTag, 
				function(networkObject)
				{
					scope.CreatePlayer(networkObject);
				},
				function(rpcArgs)
				{
					scope.RpcResponse(rpcArgs);
				},
				function(networkObject)
				{
					scope.DestroyPlayer(networkObject);
				});
		}
	}

	GetLogicPlayer()
	{
		return this.networkObject.logicObject;
	}

	CreatePlayer(networkObject)
	{
		var userName = "";

		if (networkObject.userData && networkObject.userData.username)
		{
			userName = decodeURIComponent(window.atob(networkObject.userData.username));
		}
		
		//console.log(userName);

		var userMeta = (networkObject.userData && networkObject.userData.meta) ? JSON.parse(networkObject.userData.meta) : null;
		//console.log(userMeta);

		var avatarId = 1;
		if (userMeta && userMeta.avatar)
		{
			avatarId = userMeta.avatar;
		}

		avatarId = Math.min(this.playerAssets.length - 1, avatarId);
		
		var playerAsset = this.playerAssets[avatarId];//.raw;//this.playerAssets[avatarId].lod ? this.playerAssets[avatarId].lod : this.playerAssets[avatarId].raw;
		
		// var renderableObject = SkeletonUtilsClone(playerAsset.scene ? playerAsset.scene : playerAsset);

		// renderableObject.position.copy(MMOPlayerMgr.GetSpawnPoint());

		// if (this.renderObjectCallback)
		// {
		// 	this.renderObjectCallback(renderableObject);
		// }

		//renderableObject.logicObject = new LogicPlayer(renderableObject, playerAsset.animations);

		//networkObject.renderableObject = renderableObject;
		networkObject.logicObject = new LogicPlayer(playerAsset, this.renderObjectCallback);

		var scope = this;

		if (networkObject.isOwner)
		{
			// Mark self player
			// const geometry = new CircleGeometry( 0.3, 32 );
			// const material = new MeshBasicMaterial( { color: 0xffff00 } );
			// const shadow = new Mesh( geometry, material );
			// shadow.rotation.x = -Math.PI * 0.5;
			// shadow.position.y = 0.01;

			//networkObject.renderableObject.add(shadow);

			this.networkObject = networkObject;

			setInterval(function(){

				scope.SyncRequest();
			}, 30);

			if (this.tag == 'player')
			{
				MMOPlayerMgr.LocalPlayer = this;
			}

			networkObject.logicObject.SetCamera(this.context, MMOConstants.Config.cameraMode == 'TPS' ? PlayerCamera.eType.TPS : PlayerCamera.eType.FPS);
		}
		else
		{
			var networkPlayer = new MMOPlayer(this.network, this.tag, null, null, networkObject);

			MMOPlayerMgr.NetworkPlayers.push(networkPlayer);
		}

		// Add fake shadow
		if (false)
		{
			const texture = new TextureLoader().load('assets/players/shadow.png');
			const shadowMtl = new MeshBasicMaterial( { map: texture, transparent: true, opacity: 0.5 } );
	
			const geometry = new PlaneGeometry( 0.9, 0.9 );
			const shadow = new Mesh( geometry, shadowMtl );
			shadow.rotation.x = -Math.PI * 0.5;
			shadow.position.y = 0.09;
	
			networkObject.renderableObject.add(shadow);
		}

		if (userName != 'aa')
		{
			let texture = new TextTexture({
				alignment: 'left',
				color: '#ffff00',
				fontFamily: 'system-ui',
				fontSize: 64,
				strokeColor: '#000000',
				strokeWidth: 0.0,
				text: [
					userName
				].join('\n'),
			});

			texture.redraw();

			const material = new SpriteMaterial( { map: texture } );
			const sprite = new Sprite( material );
			sprite.scale.setY(texture.height / texture.width);
			sprite.position.y = 1.85;
			sprite.scale.x *= 0.3;
			sprite.scale.y *= 0.3;
			sprite.scale.z *= 0.3;
			networkObject.renderableObject.add(sprite);
		}
	}

	DestroyPlayer(_networkObject)
	{
		console.log('destroy ' + _networkObject);
		if (_networkObject.isOwner)
		{

		}
		else
		{
			_networkObject.renderableObject.visible = false;
		}
	}

	RpcResponse(rpcArgs)
	{
		var owner = rpcArgs.owner; // This is a networkObject
		var data = rpcArgs.data;

		if (owner.renderableObject)
		{
			//owner.renderableObject.position.copy(new Vector3(data.p[0], data.p[1], data.p[2]));
			//owner.renderableObject.rotation.y = data.r;
			owner.renderableObject.logicObject.SyncRpcData(data.l);
		}
	}

	SyncRequest()
	{
		// if (this.isSyncNeed)
		// {
		// 	this.networkObject.SendRpc(MMOConstants.Receivers.Others, 
		// 		{
		// 			//p: [this.networkObject.renderableObject.position.x, this.networkObject.renderableObject.position.y, this.networkObject.renderableObject.position.z],
		// 			//r: this.networkObject.renderableObject.rotation.y,
		// 			l: this.networkObject.renderableObject.logicObject.GetSyncData()
		// 		});

		// 	this.isSyncNeed = false;
		// }

		if (this.networkObject.logicObject.IsSyncNeeded())
		{
			this.networkObject.SendRpc(MMOConstants.Receivers.Others, 
				{
					l: this.networkObject.logicObject.GetSyncData()
				});
		}
	}

	UpdateLogic(deltaTime, movement, collider)
	{
		if (this.networkObject && this.networkObject.logicObject)
		{
			this.networkObject.logicObject.Update(deltaTime, movement, collider);
		}
	}

	UpdateMovement(deltaTime, movement /*x: forward, y: back, z: left, w: right*/, collider)
	{
		this.UpdateLogic(deltaTime, movement, collider);

		for (var i = 0; i < MMOPlayerMgr.NetworkPlayers.length; ++i)
		{
			MMOPlayerMgr.NetworkPlayers[i].UpdateLogic(deltaTime);
		}
	}

	GetRenderableObject()
	{
		if (this.networkObject && this.networkObject.logicObject)
		{
			return this.networkObject.logicObject.GetRenderableObject();
		}

		return;
	}
}

export { MMOPlayerMgr, MMOPlayer }