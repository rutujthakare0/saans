import mongoose from 'mongoose';
const schema = new mongoose.Schema({ schoolId:{type:mongoose.Schema.Types.ObjectId,ref:'School',required:true,index:true}, teacherId:{type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true}, date:{type:String,required:true}, action:{type:String,enum:['pe_indoors','sensitive_students','notice_sent','outdoor_cancelled'],required:true}, actionText:{type:String,required:true}, confirmedAt:{type:Date,default:Date.now,index:true} }, { timestamps:true });
schema.index({schoolId:1,teacherId:1,action:1,date:1},{unique:true});
export default mongoose.model('ActionConfirmation', schema);
