import Array "mo:core/Array";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  // Type Definitions
  type Route = {
    routeId : Text;
    vesselType : Text;
    fuelType : Text;
    year : Nat;
    ghgIntensity : Float;
    fuelConsumption : Float;
    distance : Float;
    totalEmissions : Float;
    isBaseline : Bool;
  };

  type BankEntry = {
    routeId : Text;
    year : Nat;
    bankedAmount : Float;
    usedAmount : Float;
  };

  type PoolMember = {
    routeId : Text;
    cb_before : Float;
    cb_after : Float;
  };

  type PoolRecord = {
    poolId : Text;
    members : [PoolMember];
    poolSum : Float;
    valid : Bool;
    timestamp : Int;
  };

  type ComplianceResult = {
    energyInScope : Float;
    complianceBalance : Float;
    isCompliant : Bool;
  };

  // Modules to store comparison functions
  module Route {
    public func compare(route1 : Route, route2 : Route) : Order.Order {
      Text.compare(route1.routeId, route2.routeId);
    };
  };

  module PoolRecord {
    public func compare(pool1 : PoolRecord, pool2 : PoolRecord) : Order.Order {
      Text.compare(pool1.poolId, pool2.poolId);
    };
  };

  // Constants
  let TARGET_INTENSITY = 89.3368;
  let ENERGY_FACTOR = 41000.0;

  // State Management
  let routes = Map.empty<Text, Route>();
  let bankEntries = Map.empty<Text, BankEntry>();
  let pools = Map.empty<Text, PoolRecord>();
  var currentPoolId = 0;

  // Calculate energy in scope for a route
  func energyInScope(route : Route) : Float {
    route.fuelConsumption * ENERGY_FACTOR;
  };

  // Calculate compliance balance for a route
  func complianceBalance(route : Route) : Float {
    (TARGET_INTENSITY - route.ghgIntensity) * energyInScope(route);
  };

  // Check if route is compliant
  func isCompliant(route : Route) : Bool {
    route.ghgIntensity <= TARGET_INTENSITY;
  };

  // Check sort functions by name
  func sortPoolMembers(members : [PoolMember]) : [PoolMember] {
    members.sort(
      func(a, b) {
        Float.compare(b.cb_before, a.cb_before);
      }
    );
  };

  // Initialization with seed data
  public shared ({ caller }) func init() : async () {
    let initialRoutes = [
      {
        routeId = "R001";
        vesselType = "Container";
        fuelType = "HFO";
        year = 2024;
        ghgIntensity = 91.0;
        fuelConsumption = 5000.0;
        distance = 12000.0;
        totalEmissions = 4500.0;
        isBaseline = true;
      },
      {
        routeId = "R002";
        vesselType = "BulkCarrier";
        fuelType = "LNG";
        year = 2024;
        ghgIntensity = 88.0;
        fuelConsumption = 4800.0;
        distance = 11500.0;
        totalEmissions = 4200.0;
        isBaseline = false;
      },
      {
        routeId = "R003";
        vesselType = "Tanker";
        fuelType = "MGO";
        year = 2024;
        ghgIntensity = 93.5;
        fuelConsumption = 5100.0;
        distance = 12500.0;
        totalEmissions = 4700.0;
        isBaseline = false;
      },
      {
        routeId = "R004";
        vesselType = "RoRo";
        fuelType = "HFO";
        year = 2025;
        ghgIntensity = 89.2;
        fuelConsumption = 4900.0;
        distance = 11800.0;
        totalEmissions = 4300.0;
        isBaseline = false;
      },
      {
        routeId = "R005";
        vesselType = "Container";
        fuelType = "LNG";
        year = 2025;
        ghgIntensity = 90.5;
        fuelConsumption = 4950.0;
        distance = 11900.0;
        totalEmissions = 4400.0;
        isBaseline = false;
      },
    ];

    for (route in initialRoutes.values()) {
      routes.add(route.routeId, route);
    };
  };

  // Queries
  public query ({ caller }) func getRoutes() : async [Route] {
    routes.values().toArray().sort();
  };

  public query ({ caller }) func getBaseline() : async ?Route {
    let baselineRoute = routes.values().find(
      func(route) {
        route.isBaseline;
      }
    );
    baselineRoute;
  };

  public query ({ caller }) func getComplianceBalance(routeId : Text) : async ComplianceResult {
    switch (routes.get(routeId)) {
      case (null) {
        Runtime.trap("Route not found");
      };
      case (?route) {
        let energy = energyInScope(route);
        let cb = complianceBalance(route);
        {
          energyInScope = energy;
          complianceBalance = cb;
          isCompliant = isCompliant(route);
        };
      };
    };
  };

  public query ({ caller }) func getBankEntry(routeId : Text) : async ?BankEntry {
    bankEntries.get(routeId);
  };

  public query ({ caller }) func getAllBankEntries() : async [BankEntry] {
    bankEntries.values().toArray();
  };

  public query ({ caller }) func getPools() : async [PoolRecord] {
    pools.values().toArray().sort();
  };

  // Updates
  public shared ({ caller }) func setBaseline(routeId : Text) : async () {
    switch (routes.get(routeId)) {
      case (null) {
        Runtime.trap("Route not found");
      };
      case (?route) {
        // Clear existing baseline
        let updatedRoutes = routes.entries().toArray().map(
          func((id, r)) {
            if (r.isBaseline) {
              (id, { r with isBaseline = false });
            } else {
              (id, r);
            };
          }
        );
        routes.clear();
        for ((id, r) in updatedRoutes.values()) {
          routes.add(id, r);
        };

        // Set new baseline
        routes.add(routeId, { route with isBaseline = true });
      };
    };
  };

  // Banks surplus compliance balance
  public shared ({ caller }) func bankSurplus(routeId : Text) : async () {
    switch (routes.get(routeId)) {
      case (null) {
        Runtime.trap("Route not found");
      };
      case (?route) {
        let cb = complianceBalance(route);
        if (cb <= 0) {
          Runtime.trap("Compliance balance is not surplus");
        };

        switch (bankEntries.get(routeId)) {
          case (null) {
            let newEntry = {
              routeId;
              year = route.year;
              bankedAmount = cb;
              usedAmount = 0.0;
            };
            bankEntries.add(routeId, newEntry);
          };
          case (?entry) {
            let updatedEntry = {
              entry with
              bankedAmount = entry.bankedAmount + cb;
            };
            bankEntries.add(routeId, updatedEntry);
          };
        };
      };
    };
  };

  // Applies banked surplus to compliance balance
  public shared ({ caller }) func applyBankedSurplus(routeId : Text, amount : Float) : async () {
    switch (bankEntries.get(routeId)) {
      case (null) {
        Runtime.trap("No banked surplus found for route");
      };
      case (?entry) {
        let available = entry.bankedAmount - entry.usedAmount;
        if (amount > available) {
          Runtime.trap("Amount exceeds available banked surplus");
        };

        let updatedEntry = {
          entry with
          usedAmount = entry.usedAmount + amount;
        };
        bankEntries.add(routeId, updatedEntry);
      };
    };
  };

  // Creates a compliance pool from multiple routes
  public shared ({ caller }) func createPool(routeIds : [Text]) : async () {
    let membersList = List.empty<PoolMember>();

    // Calculate adjusted compliance balances for each route
    for (routeId in routeIds.values()) {
      switch (routes.get(routeId)) {
        case (null) {
          Runtime.trap("Route not found: " # routeId);
        };
        case (?route) {
          let cb = complianceBalance(route);
          let banked = switch (bankEntries.get(routeId)) {
            case (null) { 0.0 };
            case (?entry) { entry.bankedAmount - entry.usedAmount };
          };
          let adjustedCB = cb + banked;
          let member = {
            routeId;
            cb_before = adjustedCB;
            cb_after = adjustedCB; // Initial value
          };
          membersList.add(member);
        };
      };
    };

    // Sort members descending by compliance balance
    let sortedMembers = sortPoolMembers(membersList.toArray());
    let updatedMembersList = List.empty<PoolMember>();
    for (member in sortedMembers.values()) {
      updatedMembersList.add(member);
    };

    // Transfer surplus to deficits if possible
    var surplusAvailable : Float = 0.0;
    for (member in updatedMembersList.values()) {
      if (member.cb_after >= 0) {
        surplusAvailable += member.cb_after;
      };
    };

    // Use Nat.range and List at method for valid indices
    for (i in Nat.range(0, updatedMembersList.size())) {
      let member = updatedMembersList.at(i);
      if (member.cb_after < 0 and surplusAvailable > 0) {
        let transfer = Float.min(-member.cb_after, surplusAvailable);
        let updatedMember = {
          member with
          cb_after = member.cb_after + transfer;
        };
        updatedMembersList.put(i, updatedMember);
        surplusAvailable -= transfer;
      };
    };

    // Validate pool conditions
    if (surplusAvailable < 0) {
      Runtime.trap("Total pool balance is negative");
    };

    let validMembers = updatedMembersList.toArray();
    for (i in Nat.range(0, validMembers.size())) {
      let member = validMembers[i];
      if (member.cb_before < 0 and member.cb_after > member.cb_before) {
        Runtime.trap("Deficit member exited worse");
      } else if (member.cb_before >= 0 and member.cb_after < 0) {
        Runtime.trap("Surplus member exited negative");
      };
    };

    // Create and store pool record
    let poolId = "POOL-" # (currentPoolId + 1).toText();
    let poolRecord = {
      poolId;
      members = validMembers;
      poolSum = surplusAvailable;
      valid = true;
      timestamp = Time.now();
    };
    pools.add(poolId, poolRecord);
    currentPoolId += 1;
  };
};
