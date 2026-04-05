use spacetimedb::{ReducerContext, Table};

#[spacetimedb::table(accessor = city_data, public)]
pub struct CityData {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub city: String,
    pub data: String,
    pub timestamp: u64,
}

#[spacetimedb::table(accessor = city_watcher, public)]
pub struct CityWatcher {
    #[primary_key]
    pub session_id: String,
    pub city: String,
    pub joined_at: u64,
}

#[spacetimedb::table(accessor = shared_alert, public)]
pub struct SharedAlert {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub city: String,
    pub severity: String,
    pub message: String,
    pub created_at: u64,
}

#[spacetimedb::reducer]
pub fn save_city_data(ctx: &ReducerContext, city: String, data: String, timestamp: u64) {
    // Keep cache latest-by-city by deleting existing rows for that city before insert.
    let existing_ids: Vec<u64> = ctx
        .db
        .city_data()
        .iter()
        .filter(|row| row.city == city)
        .map(|row| row.id)
        .collect();

    for id in existing_ids {
        let _ = ctx.db.city_data().id().delete(&id);
    }

    let _ = ctx.db.city_data().insert(CityData {
        id: 0,
        city,
        data,
        timestamp,
    });
}

#[spacetimedb::reducer]
pub fn join_city(ctx: &ReducerContext, city: String) {
    let session_id = ctx.sender().to_string();
    let now = u64::try_from(ctx.timestamp.to_micros_since_unix_epoch()).unwrap_or(0) / 1000;

    let _ = ctx.db.city_watcher().session_id().delete(&session_id);
    let _ = ctx.db.city_watcher().insert(CityWatcher {
        session_id,
        city,
        joined_at: now,
    });
}

#[spacetimedb::reducer]
pub fn leave_city(ctx: &ReducerContext) {
    let session_id = ctx.sender().to_string();
    let _ = ctx.db.city_watcher().session_id().delete(&session_id);
}

#[spacetimedb::reducer]
pub fn push_alert(ctx: &ReducerContext, city: String, severity: String, msg: String) {
    let now = u64::try_from(ctx.timestamp.to_micros_since_unix_epoch()).unwrap_or(0) / 1000;
    let _ = ctx.db.shared_alert().insert(SharedAlert {
        id: 0,
        city,
        severity,
        message: msg,
        created_at: now,
    });
}
