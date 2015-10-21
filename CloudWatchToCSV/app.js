var AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1';

var cloudwatch = new AWS.CloudWatch();

var endTime = new Date();
var startTime = new Date();
startTime.setHours(endTime.getHours() - 1);

var params = {
	StartTime: startTime,
	EndTime: endTime,
	Period: 300,
	Namespace: 'AWS/EC2',
	MetricName: 'CPUUtilization',
	Statistics: ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum']
};

cloudwatch.getMetricStatistics(params, function (error, data) {
	if (error) {
		console.log(error.message);
	}
	else {
		console.log(data);
	}
});
