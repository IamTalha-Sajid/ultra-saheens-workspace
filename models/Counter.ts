import { Schema, models, model, Document } from "mongoose";

export interface CounterDoc extends Document {
    name: string;
    seq: number;
}

const CounterSchema = new Schema<CounterDoc>({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});

const Counter = models.Counter ?? model<CounterDoc>("Counter", CounterSchema);

export default Counter;
