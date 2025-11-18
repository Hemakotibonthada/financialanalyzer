import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Brain } from 'lucide-react';
import axios from 'axios';

// Simple Card components using Tailwind CSS
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`p-6 border-b border-gray-200 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-xl font-bold text-gray-900 ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Alert = ({ children, className = '' }) => (
  <div className={`p-4 rounded-lg border ${className}`}>{children}</div>
);

const AlertDescription = ({ children, className = '' }) => (
  <p className={`text-sm ${className}`}>{children}</p>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MLDashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchMLData();
  }, []);

  const fetchMLData = async () => {
    try {
      const [predictionsRes, anomaliesRes, modelsRes] = await Promise.all([
        axios.get('/api/ml/predictions'),
        axios.get('/api/ml/anomalies'),
        axios.get('/api/ml/models')
      ]);

      // Ensure data is always an array
      setPredictions(Array.isArray(predictionsRes.data) ? predictionsRes.data : predictionsRes.data?.predictions || []);
      setAnomalies(Array.isArray(anomaliesRes.data) ? anomaliesRes.data : anomaliesRes.data?.anomalies || []);
      setModels(Array.isArray(modelsRes.data) ? modelsRes.data : modelsRes.data?.models || []);
    } catch (error) {
      console.error('Error fetching ML data:', error);
      // Set empty arrays on error
      setPredictions([]);
      setAnomalies([]);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSpendingPrediction = async () => {
    try {
      const response = await axios.post('/api/ml/predictions/spending', {
        category: selectedCategory === 'all' ? null : selectedCategory,
        days: 30
      });
      alert('Prediction generated successfully!');
      fetchMLData();
    } catch (error) {
      console.error('Error generating prediction:', error);
      alert('Failed to generate prediction');
    }
  };

  const detectAnomalies = async () => {
    try {
      await axios.post('/api/ml/anomalies/detect');
      alert('Anomaly detection completed!');
      fetchMLData();
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      alert('Failed to detect anomalies');
    }
  };

  const detectFraud = async () => {
    try {
      await axios.post('/api/ml/anomalies/detect-fraud');
      alert('Fraud detection completed!');
      fetchMLData();
    } catch (error) {
      console.error('Error detecting fraud:', error);
      alert('Failed to detect fraud');
    }
  };

  const resolveAnomaly = async (anomalyId, resolution) => {
    try {
      await axios.post(`/api/ml/anomalies/${anomalyId}/resolve`, { resolution });
      alert('Anomaly resolved!');
      fetchMLData();
    } catch (error) {
      console.error('Error resolving anomaly:', error);
    }
  };

  const predictionAccuracy = (predictions || []).filter(p => p.isVerified).reduce((acc, p) => {
    acc.total++;
    if (p.accuracy >= 0.8) acc.accurate++;
    return acc;
  }, { total: 0, accurate: 0 });

  const accuracyRate = predictionAccuracy.total > 0 
    ? (predictionAccuracy.accurate / predictionAccuracy.total * 100).toFixed(1)
    : 0;

  const predictionTrends = (predictions || [])
    .slice(0, 10)
    .reverse()
    .map(p => ({
      date: new Date(p.createdAt).toLocaleDateString(),
      predicted: p.predictedValue,
      actual: p.actualValue || p.predictedValue,
      confidence: p.confidence * 100
    }));

  const anomalyStats = (anomalies || []).reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  const anomalyChartData = Object.entries(anomalyStats).map(([severity, count]) => ({
    severity,
    count
  }));

  const modelPerformance = (models || []).map(m => ({
    name: m.modelType.replace('_', ' '),
    accuracy: m.metrics.accuracy * 100,
    precision: m.metrics.precision * 100,
    recall: m.metrics.recall * 100
  }));

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading ML Dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8" />
          AI & Machine Learning Dashboard
        </h1>
        <div className="flex gap-2">
          <button
            onClick={generateSpendingPrediction}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Prediction
          </button>
          <button
            onClick={detectAnomalies}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Detect Anomalies
          </button>
          <button
            onClick={detectFraud}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Detect Fraud
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
            <p className="text-xs text-gray-500 mt-1">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracyRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Based on {predictionAccuracy.total} verified predictions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {anomalies.filter(a => a.status === 'detected').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">ML Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active models</p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="predicted" stroke="#8884d8" name="Predicted" />
              <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
              <Line type="monotone" dataKey="confidence" stroke="#ffc658" name="Confidence %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies and Model Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={anomalyChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ severity, count }) => `${severity}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {anomalyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={modelPerformance}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Precision" dataKey="precision" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Radar name="Recall" dataKey="recall" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Active Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anomalies.filter(a => a.status === 'detected').slice(0, 5).map(anomaly => (
              <Alert key={anomaly._id} variant={anomaly.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong>{anomaly.anomalyType.replace('_', ' ').toUpperCase()}</strong>
                      <p className="text-sm mt-1">{anomaly.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Severity: {anomaly.severity} | Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <button
                      onClick={() => resolveAnomaly(anomaly._id, 'Reviewed and accepted')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
            {anomalies.filter(a => a.status === 'detected').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No active anomalies detected</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Predicted Value</th>
                  <th className="text-left py-2">Actual Value</th>
                  <th className="text-left py-2">Confidence</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 10).map(pred => (
                  <tr key={pred._id} className="border-b">
                    <td className="py-2">{pred.predictionType.replace('_', ' ')}</td>
                    <td className="py-2">₹{pred.predictedValue.toLocaleString()}</td>
                    <td className="py-2">
                      {pred.actualValue ? `₹${pred.actualValue.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2">{(pred.confidence * 100).toFixed(0)}%</td>
                    <td className="py-2">
                      {pred.isVerified ? (
                        pred.accuracy >= 0.8 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Accurate
                          </span>
                        ) : (
                          <span className="text-orange-600">Inaccurate</span>
                        )
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="py-2">{new Date(pred.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MLDashboard;
