//import geckos from './geckos.io-client.2.2.0.min.js'

import geckos from '@geckos.io/client'

var MMOConstants = MMOConstants || {};

MMOConstants.Channels =
{
	RpcSync: "rpc",
	Instantiate: "inst",
  	Event: "ev",
}

MMOConstants.Receivers = 
{
	All: 0,
	Others: 1,
	Owner: 2
}

MMOConstants.Config = 
{
	rcpServer: 'http://47.100.201.129',
	cameraMode: 'FPS',
}

class MMOBaseObject
{
	network = null;
	
	networkId = 0;

	tag = null;

	isOwner = false;

	userData = null;

	constructor(network, tag)
	{
		this.network = network;

		this.tag = tag;

	}

	SendRpc(receivers, data)
	{
		this.network.SendRpc(receivers, 
		{
			i: this.networkId,
			t: this.tag,
			d: data
		});
	}
}

var MMONetwork = function(_port)
{
	var scope = this;

	var port = _port ? _port : 9208;

	this.geckosSocket = null;
	
	this.localMmoObjectCounter = 0;

	this.localMmoObjects = {};
	this.networkMmoObjects = {};

	this.instCallbackMap = {};
	this.rpcCallbackMap = {};
	this.desCallbackMap = {};

	function generateNewObject()
	{
		return scope.localMmoObjectCounter++;
	}

	function DestroyNetworkObject(networkId)
	{
		console.log('des: ' + networkId + ", " + scope.networkMmoObjects[networkId]);
		if (scope.networkMmoObjects[networkId] && scope.networkMmoObjects[networkId].desCallback)
		{
			scope.networkMmoObjects[networkId].desCallback(scope.networkMmoObjects[networkId].object);
		}
	}

	this.Setup = function(_username, _password, _roomid, _meta, callback)
	{
		const username = _username;
		const password = _password;
		const roomid = _roomid;
		const auth = `${username}|${password}|${roomid}|${JSON.stringify(_meta)}`;// + (_meta ? JSON.stringify(_meta): '');

		if (MMOConstants.Config.rcpServer)
		{
			scope.geckosSocket = geckos({ url: MMOConstants.Config.rcpServer, port: port, authorization: auth}) 
		}
		else
		{
			scope.geckosSocket = geckos({port: port, authorization: auth}) 
		}

		scope.geckosSocket.onConnect(error => {
			if (error) 
			{
				console.error('Status: ', error.status)
				console.error('StatusText: ', error.statusText)
			}
			//console.log(scope.geckosSocket.userData) // { username: 'Yannick', level: 13, points: 8987 }
		
			scope.geckosSocket.on('chat message', data => 
			{
				console.log(`You got the message ${data}`)
			})
		
		  	scope.geckosSocket.emit('chat message', 'a short message sent to the server')

			scope.geckosSocket.on(MMOConstants.Channels.RpcSync, data => 
			{
				//console.log(`You got the message ${data}`)

				ReceiveRpc(data);
			});

			scope.geckosSocket.on(MMOConstants.Channels.Instantiate, data => 
			{
				ReceiveInstantiate(data);
			});

			scope.geckosSocket.on(MMOConstants.Channels.Event, data => 
			{
				console.log('---------disconnect');

				switch (data.event)
				{
					case 'disconnect':
					{
						console.log('---------disconnect');

						console.log(data.data);

						for (var i = 0; i < data.data.length; ++i)
						{
							DestroyNetworkObject(data.data[i]);
						}
					}
					break;
				}
			});

			if (callback)
			{
				callback();
			}
		})
	}

	function Instantiate(objectId, tag)
	{
		scope.geckosSocket.emit(MMOConstants.Channels.Instantiate, 
		{
			r: MMOConstants.Receivers.Others,
			d: 
			{
				id: objectId,
				tag: tag
			}
		});
	}

	function ReceiveInstantiate(data)
	{
		//console.log(data);
		if (data.isOwner)
		{
			scope.localMmoObjects[data.objectId].object.networkId = data.networkId;
			scope.localMmoObjects[data.objectId].object.isOwner = true;
			scope.localMmoObjects[data.objectId].object.userData = data.userData;

			scope.networkMmoObjects[data.networkId] = scope.localMmoObjects[data.objectId];

			if (scope.localMmoObjects[data.objectId].instCallback)
			{
				scope.localMmoObjects[data.objectId].instCallback(scope.networkMmoObjects[data.networkId].object);
			}

			//console.log("Instantiate local: " + data.networkId);
		}
		else
		{
			InstantiateNetwork(data.networkId, data.tag, data.userData);
		}
	}

	function InstantiateNetwork(networkId, tag, userData)
	{
		var networkMmoObject = new MMOBaseObject(scope, tag);

		networkMmoObject.networkId = networkId;
		networkMmoObject.isOwner = false;
		networkMmoObject.userData = userData;

		scope.networkMmoObjects[networkId] = {};
		scope.networkMmoObjects[networkId].object = networkMmoObject;
		scope.networkMmoObjects[networkId].rpcCallback = scope.rpcCallbackMap[tag];
		scope.networkMmoObjects[networkId].instCallback = scope.instCallbackMap[tag];
		scope.networkMmoObjects[networkId].desCallback = scope.desCallbackMap[tag];

		if (scope.networkMmoObjects[networkId].instCallback)
		{
			scope.networkMmoObjects[networkId].instCallback(scope.networkMmoObjects[networkId].object);
		}

		console.log("Instantiate network: " + networkId);
	}

	this.CreateNetworkObject = function(tag, instCallback, rpcCallback, destroyCallback)
	{
		var localObjectId = generateNewObject();

		var localMmoObject = new MMOBaseObject(this, tag);

		Instantiate(localObjectId, tag);

		this.localMmoObjects[localObjectId] = {
			object: localMmoObject,
			instCallback: instCallback,
			rpcCallback: rpcCallback,
			desCallback: destroyCallback
		};

		this.instCallbackMap[tag] = instCallback;
		this.rpcCallbackMap[tag] = rpcCallback;
		this.desCallbackMap[tag] = destroyCallback;
	}

	function ReceiveRpc(data)
	{
		//console.log("receive rpc");
		//console.log(data);

		var networkId = data.i;
		var tag = data.t;

		if (!scope.networkMmoObjects[networkId])
		{
			InstantiateNetwork(networkId, tag);
		}
		
		if (scope.networkMmoObjects[networkId])
		{
			if (scope.networkMmoObjects[networkId].rpcCallback)
			{
				scope.networkMmoObjects[networkId].rpcCallback(
					{
						owner: scope.networkMmoObjects[networkId].object,
						data: data.d
					}
				);
			}
		}
	}

	this.SendRpc = function(receivers, data)
	{
		scope.geckosSocket.emit(MMOConstants.Channels.RpcSync, 
		{
			r: receivers,
			d: data
		});
	}
}


export { MMONetwork, MMOConstants, MMOBaseObject}