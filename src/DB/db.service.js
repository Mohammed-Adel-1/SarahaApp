

export const create = async ({ model, data } = {} ) => {
    return await model.create(data);
};

export const findOne = async ({ model, filter = {}, populate = "", select = {} } = {} ) => {
    return await model.findOne(filter).populate(populate).select(select);
};

export const findById = async ({ model, id = {}, populate = "", select = {} } = {} ) => {
    return await model.findById(id).populate(populate).select(select);
};

export const find = async ({ model, filter = {}, options = {} } = {} ) => {
    const doc = await model.find(filter);

    if(options.populate) doc.populate(options.populate);
    if(options.skip) doc.skip(options.skip);
    if(options.limit) doc.limit(options.limit);

    return doc.exec();
};

export const updateOne = async ({ model, filter = {}, update = {}, options = {} } = {} ) => {
    return await model.updateOne(filter, update, {runValidators: true, ...options});
};

export const findOneAndUpdate = async ({ model, filter = {}, update = {}, options = {}, select = {} } = {} ) => {
    return await model.findOneAndUpdate(filter, update, {new: true, runValidators: true, ...options}).select(select);
};

export const deleteOne = async({ model, filter = {} = {} }) => {
    return await model.deleteOne(filter)
};

export const deleteMany = async({ model, filter = {} = {} }) => {
    return await model.deleteMany(filter)
};