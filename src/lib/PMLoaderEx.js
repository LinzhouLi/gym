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
    PlaneGeometry,
    DefaultLoadingManager,
    Skeleton,
    XHRLoader,
    Object3D,
    MeshStandardMaterial,
    TextureLoader,
    BufferGeometry,
    BufferAttribute,
    SkinnedMesh,
    SkeletonHelper,
    Group
  } from 'three';
import { GLTFLoader } from './GLTFLoaderEx';

import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter'

export class PMLoaderEx
{
    constructor ( manager )
    {
        this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
    }

    loadPm(gltfScene, url, onLoad)
    {
        var scope = this;

        var baseMeshUrl = url + '/basemesh.json';
        var skeletonUrl = url + '/skeleton.json';
        var skeletonIndexUrl = url + '/skeletonindex.json';

        var pmSkeletonBones = null;
        var pmSkeletonMatrix = null;

        var animationClips = gltfScene.animations;

        var gltfModel = gltfScene.scene;
        gltfModel.traverse( function(node)
        {
            if (node instanceof Mesh)
            {
                if (!pmSkeletonBones)
                {
                    var bones = [];

                    cloneBones(node.skeleton.bones[0], bones);

                    pmSkeletonBones = new Skeleton(bones, node.skeleton.boneInverses);

                    pmSkeletonMatrix =  node.matrixWorld.clone();

                    console.log(pmSkeletonBones);
                    console.log(pmSkeletonMatrix);
                }
            }
        });

        var baseMeshloader = new XHRLoader(scope.manager);
        baseMeshloader.load(baseMeshUrl, function(baseMesh)
        {
            var skeletonLoader = new XHRLoader(scope.manager);
            skeletonLoader.load(skeletonUrl, function(skeleton)
            {
                var skeletonIndexLoader = new XHRLoader(scope.manager);
                skeletonIndexLoader.load(skeletonIndexUrl, function(skeletonIndex)
                {
                    onLoad(scope.parse(url, baseMesh, skeleton, skeletonIndex, pmSkeletonBones, pmSkeletonMatrix, animationClips, gltfScene));
                });
            });
        });

        function cloneBones(rootBone, boneArray)
        {
            var rootBoneClone = rootBone.clone();

            rootBoneClone.children.splice(0, rootBoneClone.children.length);
            boneArray.push(rootBoneClone);

            for (var i = 0 ; i < rootBone.children.length ; ++i)
            {
                rootBoneClone.add(cloneBones(rootBone.children[i], boneArray));
            }

            return rootBoneClone;
        }
    }

    load(url, onLoad, onProgress, onError, rawModel)
    {
        var scope = this;
        this.url = url;

        if (rawModel)
        {
            scope.loadPm(rawModel, url, onLoad);
        }
        else
        {
            var animLoader = new GLTFLoader();
            animLoader.load(url + '/gltf/scene.gltf', function (gltfScene)
            {
                scope.loadPm(gltfScene, url, onLoad);
            });
        }
    }

    parse(url, baseMesh, skeleton, skeletonIndex, skeletonBones , skeletonMatrix, animationClips, gltfScene)
    {
        var rootObject = new Object3D();

        var pmFilesUrl = url + '/pm/';
        var texFilesUrl = url;

        var isPmLoading = true;
        var pmDeltaTime = isPmLoading ? 500 : 5;
        var splitCount = 0;
        var meshMat = {};
        var pmCount = 0;
        var incidentFaces = {};
        var meshData = {vertices:[] ,faces:[] ,uvs:[] ,materials:[] ,Uvfaces:[], joints:[], weights:[]};
        var mapMaterial={};

        var jsonData = JSON.parse(baseMesh);
        var skeletonData = JSON.parse(skeleton);
        var skeletonIndexData = JSON.parse(skeletonIndex);

        var material_id=0;
        var mesh={};

        var meshMaterialMap = {};

        var pmLoadingTimeout = 50;

        var imageLodLevel = 0;

        var MaxLODLevel = 5;

        var imgLoadingGapTime = 1200;

        // Store base mesh
        for (var i = 0 ; i < jsonData.geometries[0].data.vertices.length / 3 ; ++i)
        {
            meshData.vertices.push([jsonData.geometries[0].data.vertices[i * 3 + 0] , jsonData.geometries[0].data.vertices[i * 3 + 1] , jsonData.geometries[0].data.vertices[i * 3 + 2]]);
        }

        for (var i = 0 ; i < jsonData.geometries[0].data.vertices.length / 3 ; ++i)
        {
            var skeletonId = skeletonIndexData[i];
            meshData.joints.push(skeletonData.joints[skeletonId]);
            meshData.weights.push(skeletonData.weights[skeletonId]);
        }

        //console.log('length: ' + meshData.vertices.length + ', ' + meshData.joints.length);

        //console.log(meshData.joints);

        for(var i = 0 ; i < jsonData.geometries[0].data.uvs.length / 2 ; ++i)
        {
            meshData.uvs.push([jsonData.geometries[0].data.uvs[i * 2 + 0] , jsonData.geometries[0].data.uvs[i * 2 + 1]]);
        }

        for(var i = 0 ; i < jsonData.geometries[0].data.faces.length; ++i)
        {
            if(jsonData.geometries[0].data.faces[i].length>0)
            {
                mapMaterial[i]=material_id;
                meshData.materials.push(jsonData.geometries[0].data.materials[i]);
                var tmpfaces=[];
                var tmpUvfaces=[];
                for (var j = 0 ; j < jsonData.geometries[0].data.faces[i].length / 3 ; ++j)
                {
                    tmpfaces.push([jsonData.geometries[0].data.faces[i][j * 3 + 0] , jsonData.geometries[0].data.faces[i][j * 3 + 1] , jsonData.geometries[0].data.faces[i][j * 3 + 2]]);
                    //console.log("faceData:"+meshData.faces[i]);
                    tmpUvfaces.push([jsonData.geometries[0].data.Uvfaces[i][j*3+0],jsonData.geometries[0].data.Uvfaces[i][j*3+1],jsonData.geometries[0].data.Uvfaces[i][j*3+2]]);
                }
                meshData.faces.push(tmpfaces);
                meshData.Uvfaces.push(tmpUvfaces);
                material_id++;
            }
        }
        computeIncidentFaces();

        computeBoundingBox();

        for(var i=0; i< meshData.materials.length;i++)
        {
            meshMat[i] = new MeshStandardMaterial(
                {
                    metalness : 0.5,
                    roughness : 0.5,
                    map: null,
                    transparent: false,
                    opacity : true,
                });
            meshMat[i].name = i + "-" + i;

            startLogImageLoading(meshMat[i], meshData.materials[i]);
        }

        if (isPmLoading)
        {
            //Set BufferGeometry of Base mesh
            for(var Meshid=0; Meshid < meshData.faces.length; Meshid++)
            {
                restoreMesh(Meshid);
            }
        }

        loadLocalFile(pmFilesUrl + 'desc.json',function (data)
        {
            var jsonData = JSON.parse(data);
            splitCount = jsonData.splitCount;

            startPmLoading();
        });

        if (gltfScene)
        {
            var pmScene = {};

            pmScene.scene = new Group();
            pmScene.scene.add(rootObject);
            pmScene.animations = animationClips;
    
            return pmScene;
        }
        else
        {
            rootObject.animations = animationClips;

            return rootObject;
        }
        /***************************************************************************************************************/
        function startLogImageLoading(srcMtl , imgFile)
        {
            if (!srcMtl || !imgFile)
            {
                return;
            }

            var imgFileNameWithoutEx = imgFile.substring(0, imgFile.lastIndexOf('.'));
            var imgFileExtension = imgFile.substring(imgFile.lastIndexOf('.') + 1 , imgFile.length);

            meshMaterialMap[imgFileNameWithoutEx] = srcMtl;

            loadLodImage(imgFileNameWithoutEx, imgFileExtension);
        }

        function loadLodImage(imageFileNameWithoutEx, imageFileExtension, isSrcImage)
        {
            var imgUrl = texFilesUrl + '/' + imageFileNameWithoutEx + (isSrcImage ? '' : ('_' + imageLodLevel)) + '.' + imageFileExtension;

            var loader = new TextureLoader();
            loader.load(imgUrl, function ( texture )
            {
                var lodImgName = texture.image.src.substring(texture.image.src.lastIndexOf('/') + 1, texture.image.src.length);
                var srcImgName = isSrcImage ? lodImgName.substring(0, lodImgName.lastIndexOf('.')) : lodImgName.substring(0, lodImgName.lastIndexOf('_'));

                if ( meshMaterialMap[srcImgName])
                {
                    meshMaterialMap[srcImgName].map = texture;
                    meshMaterialMap[srcImgName].needsUpdate = true;
                }

                imageLodLevel++;

                if (!isSrcImage && imageLodLevel <= MaxLODLevel)
                {
                    setTimeout(function()
                    {
                        loadLodImage(imageFileNameWithoutEx, imageFileExtension, imageLodLevel == MaxLODLevel);

                    } , imgLoadingGapTime);
                }
            },
            undefined,
            function ( err )
            {
                loadLodImage(imageFileNameWithoutEx, imageFileExtension, true);
            });
        }

        function setupPmSkinnedMesh(model, skeletonBones , skeletonMatrix)
        {
            console.log('bind skeleton');
            
            for (var i = 0 ; i < model.children.length; ++i)
            {
                if (model.children[i] instanceof SkinnedMesh)
                {
                    var skinnedMesh = model.children[i];

                    skinnedMesh.add(skeletonBones.bones[0]);
                    skinnedMesh.bind(skeletonBones,skeletonMatrix);
                }
            }

            //var skeletonHelperPM = new SkeletonHelper(model);
            //model.add(skeletonHelperPM);
        }

        function loadLocalFile(fileName , loadCallback)
        {
            var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

            xmlhttp.onreadystatechange = function ()
            {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
                {
                    if (loadCallback)
                    {
                        loadCallback(xmlhttp.responseText);
                    }
                }
            }

            xmlhttp.open("GET", fileName, true);
            xmlhttp.send();
        }

        function objLength(object)
        {
            var n=0;

            for(var i in object)
            {
                n++;
            }
            return n;
        }

        function computeIncidentFaces()
        {
            for (var i = 0 ; i < meshData.vertices.length ; ++i)
            {
                incidentFaces[i] = [];
            }
            //map construct
            //for(var fi = 0 ; fi < meshData.faces.length ; ++fi)
            //{
            //mapFace[meshData.faces[fi]]=fi;
            //}
            //
            for (var fi=0;fi<meshData.faces.length;fi++)
            {

                for (var vi = 0 ; vi < meshData.faces[fi].length ; ++vi)
                {
                    for(var faceIndex=0;faceIndex<3;faceIndex++)
                    {
                        incidentFaces[meshData.faces[fi][vi][faceIndex]].push(vi);
                    }
                }
            }
        }

        function computeBoundingBox()
        {
            var minX = 99999.0 , maxX = -99999.0 , minY = 99999.0 , maxY = -99999.0 , minZ = 99999.0 , maxZ = -99999.0;

            for (var i = 0 ; i < meshData.vertices.length ; ++i)
            {
                minX = Math.min(minX , meshData.vertices[i][0]);
                maxX = Math.max(maxX , meshData.vertices[i][0]);

                minY = Math.min(minY , meshData.vertices[i][1]);
                maxY = Math.max(maxY , meshData.vertices[i][1]);

                minZ = Math.min(minZ , meshData.vertices[i][2]);
                maxZ = Math.max(maxZ , meshData.vertices[i][2]);
            }

            meshData.bbox =
                {
                    min : {x : minX , y : minY , z : minZ} ,
                    max : {x : maxX , y : maxY , z : maxZ} ,
                    center : {x : (minX + maxX) * 0.5 , y : (minY + maxY) * 0.5 , z : (minZ + maxZ) * 0.5}
                };
        }

        function isOriginalFaceOfT(tIndex ,objectF,Meshid, face , vsData)
        {
            /*for (var vsfi = 0 ; vsfi < vsData.Faces.length ; ++vsfi)
            {
                var index = -1;
                var isFace = true;

                for (var i = 0 ; i < 3 ; ++i)
                {
                    if (vsData.Faces[vsfi].Indices[i] == tIndex && face[i] == vsData.S)
                    {
                        index = i;
                    }
                    else if (vsData.Faces[vsfi].Indices[i] != face[i])
                    {
                        isFace = false;
                    }
                }

                if (isFace)
                {
                    return index;
                }
            }*/
            for (var vsfi = 0 ; vsfi < vsData.Faces.length ; vsfi+=6)
            {
                var index = -1;
                var isFace = true;


                for (var i = 0 ; i < 3 ; ++i)
                {
                    if(vsData.Faces[vsfi+2*i] == meshData.faces[Meshid][face][i])
                    {
                        objectF.faceSIndex=(vsfi/6);
                    }


                    if (vsData.Faces[vsfi+2*i] == tIndex && meshData.faces[Meshid][face][i]== vsData.S)
                    {
                        index = i;
                        objectF.faceIndex=(vsfi/6);
                    }
                    else if (vsData.Faces[vsfi+2*i] != meshData.faces[Meshid][face][i])
                    {
                        isFace = false;
                    }
                }

                if (isFace)
                {
                    return index;
                }
            }


            return -1;
        }

        function restoreVertexSplit(si,vsData)
        {
            // Restore S-Position
            //meshData.vertices[vsData.S][0] = vsData.SPosition.pos.x;
            //meshData.vertices[vsData.S][1] = vsData.SPosition.pos.y;
            //meshData.vertices[vsData.S][2] = vsData.SPosition.pos.z;
            var Meshid=mapMaterial[vsData.FacesMaterial[0]];

            meshData.vertices[vsData.S][0] = vsData.SPosition[0];
            meshData.vertices[vsData.S][1] = vsData.SPosition[1];
            meshData.vertices[vsData.S][2] = vsData.SPosition[2];

            for(var i=0;i<vsData.UVs.length/2;i++)
            {
                meshData.uvs.push([vsData.UVs[2*i+0],vsData.UVs[2*i+1]]);
            }
            //Restore S-uv
            //meshData.uvs[vsData.S][0] = vsData.SPosition.uv.x;
            //meshData.uvs[vsData.S][1] = vsData.SPosition.uv.y;
            //Add T-uv
            //meshData.uvs.push([vsData.TPosition.uv.x,vsData.TPosition.uv.y]);
            // Add T-Position
            //meshData.vertices.push([vsData.TPosition.pos.x , vsData.TPosition.pos.y , vsData.TPosition.pos.z]);
            meshData.vertices.push([vsData.TPosition[0] , vsData.TPosition[1] , vsData.TPosition[2]]);

            meshData.joints.push(skeletonData.joints[vsData.T]);
            meshData.weights.push(skeletonData.weights[vsData.T]);

            var t = meshData.vertices.length - 1;
            //console.log("index:"+t);
            incidentFaces[t] = [];

            var newFacesOfS = [];
            var addnum=0;
            for (var fosi = 0 ; fosi < incidentFaces[vsData.S].length ; ++fosi)
            {
                var bufferIndex=incidentFaces[vsData.S][fosi];
                var objectF={faceIndex:0,faceSIndex:0};
                var c = isOriginalFaceOfT(t,objectF,Meshid,bufferIndex,vsData);

                if (c < 0)
                {
                    var faceIndexS=objectF.faceSIndex;
                    newFacesOfS.push(bufferIndex);
                    var newfUVs=[vsData.Faces[faceIndexS*6+1],vsData.Faces[faceIndexS*6+3],vsData.Faces[faceIndexS*6+5]];
                    meshData.Uvfaces[Meshid][bufferIndex]=newfUVs;
                    //console.log("Sindex:"+faceIndexS);
                    continue;
                }
                addnum++;
                //incidentFaces[vsData.S][fosi][c] = t;

                //console.log("index_change:"+bufferIndex);
                meshData.faces[Meshid][bufferIndex][c]=t;
                incidentFaces[t].push(bufferIndex);
                //updata uv
                //console.log("faceIndex:"+c);
                var faceIndex=objectF.faceIndex;
                var newfUV=[vsData.Faces[faceIndex*6+1],vsData.Faces[faceIndex*6+3],vsData.Faces[faceIndex*6+5]];
                meshData.Uvfaces[Meshid][bufferIndex]=newfUV;
            }
            //console.log("Add num"+si+":"+addnum);
            incidentFaces[vsData.S] = newFacesOfS;

            for (var sfi = 0 ; sfi < vsData.Faces.length ; sfi+=6)
            {
                var hasST;
                //vsData.Faces[sfi+0] == vsData.S || vsData.Faces[sfi+1] == vsData.S || vsData.Faces[sfi+2] == vsData.S;
                if(vsData.Faces[sfi+0] == vsData.S){hasST=(vsData.Faces[sfi+2] ==t ||vsData.Faces[sfi+4] == t)}
                else if(vsData.Faces[sfi+2] == vsData.S){hasST=(vsData.Faces[sfi+0] ==t ||vsData.Faces[sfi+4] == t)}
                else if(vsData.Faces[sfi+4] == vsData.S){hasST=(vsData.Faces[sfi+0] ==t ||vsData.Faces[sfi+2] == t)}
                else{hasST=false;}

                if (!hasST)
                {
                    continue;
                }

                var newFace = [vsData.Faces[sfi+0] , vsData.Faces[sfi+2] , vsData.Faces[sfi+4]];
                var index=(sfi/6);
                var iUV=[vsData.Faces[index*6+1],vsData.Faces[index*6+3],vsData.Faces[index*6+5]];
                var num=meshData.faces[Meshid].length;
                meshData.Uvfaces[Meshid].push(iUV);
                meshData.faces[Meshid].push(newFace);

                // Update incident faces
                for (var i = 0 ; i < newFace.length ; ++i)
                {
                    incidentFaces[newFace[i]].push(num);
                }
            }
        }

        function vecLength(v1 , v2)
        {
            return Math.sqrt((v1.x - v2.x) * (v1.x - v2.x) + (v1.y - v2.y) * (v1.y - v2.y) + (v1.z - v2.z) * (v1.z - v2.z));
        }

        function pmRestore(pmData)
        {
            //restore Mesh pm id array
            var mapPM={};
            for (var si = 0 ; si < pmData.length ; ++si)
            {
                var id=mapMaterial[pmData[si].FacesMaterial[0]];
                mapPM[id]=true;
                restoreVertexSplit(si,pmData[si]);

            }

            //console.log('restore over! ' + pmData.length);
            //console.log('face_num!: ' + meshData.faces[0].length);
            //console.log('uv_num!: ' + meshData.uvs.length/3);

            if (isPmLoading)
            {
                for(var key in mapPM)
                {
                    restoreMesh(key);
                }
            }
        }

        function restoreMesh(Meshid)
        {
            var useSkinning = true;

            rootObject.remove(mesh[Meshid]);
            var geometry = new BufferGeometry();

            updateGeometry(geometry , meshData,Meshid);

            geometry.computeVertexNormals();
            geometry.needsUpdate = true;

            if (useSkinning == false)
            {
                mesh[Meshid] = new Mesh(geometry, meshMat[Meshid]);
            }
            else
            {

                mesh[Meshid] = new SkinnedMesh(geometry, meshMat[Meshid]);
                meshMat[Meshid].skinning = true;
            }

            //mesh[Meshid].translateX(-meshData.bbox.center.x);
            //mesh[Meshid].translateY(-meshData.bbox.center.y);
            //mesh[Meshid].translateZ(-meshData.bbox.center.z);

            rootObject.add(mesh[Meshid]);

            setupPmSkinnedMesh(rootObject, skeletonBones, skeletonMatrix);
        }

        function updateGeometry(geometry, meshData, Meshid)
        {
            //var verticesArray = new Float32Array(meshData.vertices.length * 3);
            //for (var i = 0 ; i < meshData.vertices.length; ++i)
            //{
            //    verticesArray[i * 3 + 0] = meshData.vertices[i][0];
            //    verticesArray[i * 3 + 1] = meshData.vertices[i][1];
            //    verticesArray[i * 3 + 2] = meshData.vertices[i][2];
            // }
            //console.log("uv:"+meshData.uvs.length);
            //console.log("face:"+objLength(meshData.faces));
            var verticesArray = new Float32Array(meshData.faces[Meshid].length * 3 * 3);
            var indicesArray = new Uint32Array(meshData.faces[Meshid].length * 3);
            var uvsArray = new Float32Array(meshData.faces[Meshid].length * 3*2);
            var jointArray = new Uint16Array(meshData.faces[Meshid].length * 3 * 4);
            var weightArray = new Float32Array(meshData.faces[Meshid].length * 3 * 4);

            //var f1=0;
            for (var key=0;key<meshData.faces[Meshid].length;key++)
            {
                indicesArray[key * 3 + 0] = key * 3 + 0;
                indicesArray[key * 3 + 1] = key * 3 + 1;
                indicesArray[key * 3 + 2] = key * 3 + 2;

                //position
                var fx=meshData.faces[Meshid][key][0];
                var fy=meshData.faces[Meshid][key][1];
                var fz=meshData.faces[Meshid][key][2];
                verticesArray[key*9+0]=meshData.vertices[fx][0];
                verticesArray[key*9+1]=meshData.vertices[fx][1];
                verticesArray[key*9+2]=meshData.vertices[fx][2];
                verticesArray[key*9+3]=meshData.vertices[fy][0];
                verticesArray[key*9+4]=meshData.vertices[fy][1];
                verticesArray[key*9+5]=meshData.vertices[fy][2];
                verticesArray[key*9+6]=meshData.vertices[fz][0];
                verticesArray[key*9+7]=meshData.vertices[fz][1];
                verticesArray[key*9+8]=meshData.vertices[fz][2];

                // joint
                jointArray[key * 12 + 0] = meshData.joints[fx][0];
                jointArray[key * 12 + 1] = meshData.joints[fx][1];
                jointArray[key * 12 + 2] = meshData.joints[fx][2];
                jointArray[key * 12 + 3] = meshData.joints[fx][3];
                jointArray[key * 12 + 4] = meshData.joints[fy][0];
                jointArray[key * 12 + 5] = meshData.joints[fy][1];
                jointArray[key * 12 + 6] = meshData.joints[fy][2];
                jointArray[key * 12 + 7] = meshData.joints[fy][3];
                jointArray[key * 12 + 8] = meshData.joints[fz][0];
                jointArray[key * 12 + 9] = meshData.joints[fz][1];
                jointArray[key * 12 + 10] = meshData.joints[fz][2];
                jointArray[key * 12 + 11] = meshData.joints[fz][3];

                // weight
                weightArray[key * 12 + 0] = meshData.weights[fx][0];
                weightArray[key * 12 + 1] = meshData.weights[fx][1];
                weightArray[key * 12 + 2] = meshData.weights[fx][2];
                weightArray[key * 12 + 3] = meshData.weights[fx][3];
                weightArray[key * 12 + 4] = meshData.weights[fy][0];
                weightArray[key * 12 + 5] = meshData.weights[fy][1];
                weightArray[key * 12 + 6] = meshData.weights[fy][2];
                weightArray[key * 12 + 7] = meshData.weights[fy][3];
                weightArray[key * 12 + 8] = meshData.weights[fz][0];
                weightArray[key * 12 + 9] = meshData.weights[fz][1];
                weightArray[key * 12 + 10] = meshData.weights[fz][2];
                weightArray[key * 12 + 11] = meshData.weights[fz][3];

                //uv
                uvsArray[key*6+0]=meshData.uvs[meshData.Uvfaces[Meshid][key][0]][0];
                uvsArray[key*6+1]=meshData.uvs[meshData.Uvfaces[Meshid][key][0]][1];
                uvsArray[key*6+2]=meshData.uvs[meshData.Uvfaces[Meshid][key][1]][0];
                uvsArray[key*6+3]=meshData.uvs[meshData.Uvfaces[Meshid][key][1]][1];
                uvsArray[key*6+4]=meshData.uvs[meshData.Uvfaces[Meshid][key][2]][0];
                uvsArray[key*6+5]=meshData.uvs[meshData.Uvfaces[Meshid][key][2]][1];
                //f1++;
            }

            //var uvsArray=new Float32Array(meshData.uvs.length*2);
            //for (var i = 0 ; i < meshData.uvs.length; ++i)
            //{
            //	uvsArray[i*2+0]=meshData.uvs[i][0];
            //	uvsArray[i*2+1]=meshData.uvs[i][1];
            //}
            geometry.setIndex( new BufferAttribute(indicesArray, 1));
            geometry.addAttribute( 'position', new BufferAttribute(verticesArray , 3));
            geometry.addAttribute('uv', new BufferAttribute(uvsArray,2));
            geometry.addAttribute('skinIndex' , new BufferAttribute(jointArray , 4));
            geometry.addAttribute('skinWeight' , new BufferAttribute(weightArray , 4));

            geometry.computeVertexNormals();
            verticesArray=null;
            indicesArray=null;
            uvsArray=null;
            jointArray=null;
            weightArray=null;
            geometry.needsUpdate = true;
        }

        function startPmLoading()
        {
            //restoreMesh();

            // setTimeout(function()
            // {
            //     loadPmMesh(pmCount , function()
            //     {
            //         if (pmCount < splitCount)
            //         {
            //             setTimeout(function(){startPmLoading();} , pmDeltaTime);
            //         }
            //         else
            //         {
            //             if (isPmLoading == false)
            //             {
            //                 restoreMesh();
            //             }
            //         }
            //     });

            //     pmCount++;
            // } , pmDeltaTime);
        }

        function loadPmMesh(index , callback)
        {
            loadLocalFile(pmFilesUrl + '/pmmesh' + index + '.json', function (data)
            {
                var pmData = JSON.parse(data);

                pmRestore(pmData);

                if (callback)
                {
                    callback();
                }
            });
        }
    }
}