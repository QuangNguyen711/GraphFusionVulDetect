// MongoDB initialization script for development
db = db.getSiblingDB('graphfusion');

// Create collections
db.createCollection('users');
db.createCollection('vulnerability_reports');
db.createCollection('graph_data');
db.createCollection('analysis_results');
db.createCollection('models');
db.createCollection('sessions');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "created_at": 1 });

db.vulnerability_reports.createIndex({ "contract_address": 1 });
db.vulnerability_reports.createIndex({ "created_at": -1 });
db.vulnerability_reports.createIndex({ "vulnerability_type": 1 });
db.vulnerability_reports.createIndex({ "severity": 1 });

db.graph_data.createIndex({ "contract_hash": 1 }, { unique: true });
db.graph_data.createIndex({ "created_at": -1 });

db.analysis_results.createIndex({ "contract_address": 1 });
db.analysis_results.createIndex({ "model_version": 1 });
db.analysis_results.createIndex({ "created_at": -1 });

db.models.createIndex({ "version": 1 }, { unique: true });
db.models.createIndex({ "created_at": -1 });

db.sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });

// Create application user
db.createUser({
  user: "graphfusion_app",
  pwd: "app_password",
  roles: [
    {
      role: "readWrite",
      db: "graphfusion"
    }
  ]
});

print("GraphFusion database initialized successfully!");
