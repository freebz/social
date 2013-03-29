require.config({
    paths: {
	jQuery: '/js/libs/jquery',
	Underscore: '/js/libs/underscore',
	Backbone: '/js/libs/backbone',
	models: 'models',
	text: '/js/libs/text',
	templates: '../templates',

	SocialNetView: '/js/SocialNetView',
	Sockets: '/socket.io/socket.io'
    },

    shim: {
	'Backbone': ['Underscore', 'jQuery'],
	'SocialNet': ['Backbone']
    }
});

require(['SocialNet'], function(SocialNet){
    SocialNet.initialize();
});
