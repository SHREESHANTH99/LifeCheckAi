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
