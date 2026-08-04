// Placeholder so `data.archive_file` in ../lambda.tf can resolve.
//
// This directory exists for one reason: archive_file is evaluated at PLAN
// time, and the bundles this stack was originally built from lived in
// api/dist-lambda/, which the microservices refactor deleted. Without
// something to zip, every `plan`, `apply` and `destroy` against this stack
// fails before it can do anything — including the `destroy` that retires it.
//
// This file is never executed. The live functions keep running the code
// already in their state, and ../lambda.tf ignores changes to `filename` and
// `source_code_hash` precisely so that an apply cannot push this placeholder
// over the top of them.
//
// The whole legacy root stack is scheduled for teardown; when it goes, this
// goes with it.
exports.handler = async () => {
  throw new Error("placeholder bundle — see infra/legacy-placeholder/index.js");
};
