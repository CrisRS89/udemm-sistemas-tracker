import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const projectId = "demo-udemm-tracker";
let testEnv;

const validPlan = (careerId = "sistemas") => ({
  version: 3,
  careerId,
  subjectsJson: JSON.stringify([{ id: "I0001", status: "pending", grade: null }]),
  strictMode: true,
  updatedAt: serverTimestamp(),
});

const planRef = (context, uid = "alice", careerId = "sistemas") =>
  doc(context.firestore(), "users", uid, "careers", careerId);

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test("denies unauthenticated reads and writes", async () => {
  const guest = testEnv.unauthenticatedContext();
  await assertFails(getDoc(planRef(guest)));
  await assertFails(setDoc(planRef(guest), validPlan()));
});

test("allows an owner to create, read and update a valid plan", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const ref = planRef(alice);

  await assertSucceeds(setDoc(ref, validPlan()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(setDoc(ref, { ...validPlan(), strictMode: false }));
});

test("prevents another user from reading or overwriting a plan", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const bob = testEnv.authenticatedContext("bob");
  await assertSucceeds(setDoc(planRef(alice), validPlan()));

  await assertFails(getDoc(planRef(bob, "alice")));
  await assertFails(setDoc(planRef(bob, "alice"), validPlan()));
});

test("rejects unsupported careers and path/data mismatches", async () => {
  const alice = testEnv.authenticatedContext("alice");
  await assertFails(setDoc(planRef(alice, "alice", "medicina"), validPlan("medicina")));
  await assertFails(setDoc(planRef(alice, "alice", "sistemas"), validPlan("industrial")));
});

test("rejects missing, extra, mistyped and oversized fields", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const ref = planRef(alice);
  const { strictMode: _strictMode, ...missingField } = validPlan();

  await assertFails(setDoc(ref, missingField));
  await assertFails(setDoc(ref, { ...validPlan(), extraData: "no permitido" }));
  await assertFails(setDoc(ref, { ...validPlan(), strictMode: "true" }));
  await assertFails(setDoc(ref, { ...validPlan(), subjectsJson: "x".repeat(200001) }));
  await assertFails(setDoc(ref, { ...validPlan(), updatedAt: new Date(0) }));
});

test("denies deletes because the application never needs them", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const ref = planRef(alice);
  await assertSucceeds(setDoc(ref, validPlan()));
  await assertFails(deleteDoc(ref));
});
