// MongoDB initialization script for production
db = db.getSiblingDB('graphfusion');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password_hash", "created_at"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        password_hash: {
          bsonType: "string"
        },
        role: {
          bsonType: "string",
          enum: ["admin", "user", "analyst"]
        },
        created_at: {
          bsonType: "date"
        },
        last_login: {
          bsonType: "date"
        }
      }
    }
  }
});

db.createCollection('vulnerability_reports', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["contract_address", "vulnerability_type", "severity", "created_at"],
      properties: {
        contract_address: {
          bsonType: "string"
        },
        vulnerability_type: {
          bsonType: "string",
          enum: ["reentrancy", "timestamp_dependency", "integer_overflow", "access_control", "other"]
        },
        severity: {
          bsonType: "string",
          enum: ["low", "medium", "high", "critical"]
        },
        confidence_score: {
          bsonType: "double",
          minimum: 0,
          maximum: 1
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  }
});

db.createCollection('graph_data');
db.createCollection('analysis_results');
db.createCollection('models');
db.createCollection('sessions');
db.createCollection('audit_logs');

// Create indexes with performance optimization
db.users.createIndex({ "email": 1 }, { unique: true, background: true });
db.users.createIndex({ "created_at": 1 }, { background: true });
db.users.createIndex({ "role": 1, "last_login": -1 }, { background: true });

db.vulnerability_reports.createIndex({ "contract_address": 1 }, { background: true });
db.vulnerability_reports.createIndex({ "created_at": -1 }, { background: true });
db.vulnerability_reports.createIndex({ "vulnerability_type": 1, "severity": 1 }, { background: true });
db.vulnerability_reports.createIndex({ "confidence_score": -1 }, { background: true });

db.graph_data.createIndex({ "contract_hash": 1 }, { unique: true, background: true });
db.graph_data.createIndex({ "created_at": -1 }, { background: true });
db.graph_data.createIndex({ "size": 1 }, { background: true });

db.analysis_results.createIndex({ "contract_address": 1, "model_version": 1 }, { background: true });
db.analysis_results.createIndex({ "created_at": -1 }, { background: true });
db.analysis_results.createIndex({ "processing_time": 1 }, { background: true });

db.models.createIndex({ "version": 1 }, { unique: true, background: true });
db.models.createIndex({ "created_at": -1 }, { background: true });
db.models.createIndex({ "status": 1 }, { background: true });

db.sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0, background: true });
db.sessions.createIndex({ "user_id": 1 }, { background: true });

db.audit_logs.createIndex({ "timestamp": -1 }, { background: true });
db.audit_logs.createIndex({ "user_id": 1, "action": 1 }, { background: true });
db.audit_logs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Create application users
db.createUser({
  user: "graphfusion_app",
  pwd: "secure_app_password_production",
  roles: [
    {
      role: "readWrite",
      db: "graphfusion"
    }
  ]
});

db.createUser({
  user: "graphfusion_analytics",
  pwd: "secure_analytics_password",
  roles: [
    {
      role: "read",
      db: "graphfusion"
    }
  ]
});

// Create initial admin user
db.users.insertOne({
  email: "admin@graphfusion.local",
  password_hash: "$2b$12$placeholder_hash_change_in_production",
  role: "admin",
  created_at: new Date(),
  last_login: null
});

print("GraphFusion production database initialized successfully!");
print("Remember to change default passwords in production!");
